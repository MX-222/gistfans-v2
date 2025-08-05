-- GistFans Pro 连接池管理系统
-- 适配 Supabase Pro 方案的完整连接池解决方案

-- 1. 连接日志表
CREATE TABLE IF NOT EXISTS connection_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    connection_count INTEGER,
    active_count INTEGER,
    idle_count INTEGER,
    zombie_count INTEGER,
    terminated_count INTEGER DEFAULT 0,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at ON connection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_logs_event_type ON connection_logs(event_type);

-- 2. 连接池健康视图
CREATE OR REPLACE VIEW connection_health AS
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    count(*) FILTER (WHERE state = 'idle' AND state_change < NOW() - INTERVAL '15 minutes') as zombie_connections,
    count(*) FILTER (WHERE state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes') as long_idle_connections,
    current_setting('max_connections')::int as max_connections,
    ROUND(
        (count(*) * 100.0 / current_setting('max_connections')::int), 2
    ) as utilization_percentage,
    NOW() as last_check
FROM pg_stat_activity 
WHERE datname = current_database()
    AND pid != pg_backend_pid();

-- 3. 连接详情视图（用于调试）
CREATE OR REPLACE VIEW connection_details AS
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    client_hostname,
    client_port,
    backend_start,
    xact_start,
    query_start,
    state_change,
    state,
    backend_xid,
    backend_xmin,
    query,
    backend_type,
    EXTRACT(EPOCH FROM (NOW() - state_change)) as idle_seconds,
    EXTRACT(EPOCH FROM (NOW() - backend_start)) as connection_age_seconds,
    CASE 
        WHEN state = 'idle' AND state_change < NOW() - INTERVAL '15 minutes' THEN 'zombie'
        WHEN state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes' THEN 'long_idle'
        WHEN state = 'active' AND query_start < NOW() - INTERVAL '30 seconds' THEN 'long_running'
        ELSE 'normal'
    END as connection_status
FROM pg_stat_activity 
WHERE datname = current_database()
    AND pid != pg_backend_pid()
ORDER BY state_change DESC;

-- 4. 主动连接监控函数
CREATE OR REPLACE FUNCTION monitor_connections()
RETURNS TABLE(
    total_conn INTEGER,
    active_conn INTEGER, 
    idle_conn INTEGER,
    zombie_conn INTEGER,
    long_idle_conn INTEGER,
    utilization_pct NUMERIC,
    max_conn INTEGER,
    status TEXT
) AS $$
DECLARE
    conn_data RECORD;
BEGIN
    SELECT * INTO conn_data FROM connection_health LIMIT 1;
    
    -- 记录监控事件
    INSERT INTO connection_logs (event_type, connection_count, active_count, idle_count, zombie_count, details)
    VALUES (
        'MONITOR_CHECK',
        conn_data.total_connections,
        conn_data.active_connections,
        conn_data.idle_connections,
        conn_data.zombie_connections,
        jsonb_build_object(
            'utilization_percentage', conn_data.utilization_percentage,
            'long_idle_connections', conn_data.long_idle_connections,
            'max_connections', conn_data.max_connections
        )
    );
    
    RETURN QUERY
    SELECT 
        conn_data.total_connections,
        conn_data.active_connections,
        conn_data.idle_connections,
        conn_data.zombie_connections,
        conn_data.long_idle_connections,
        conn_data.utilization_percentage,
        conn_data.max_connections,
        CASE 
            WHEN conn_data.utilization_percentage > 90 THEN 'CRITICAL'
            WHEN conn_data.utilization_percentage > 80 THEN 'WARNING'
            WHEN conn_data.zombie_connections > 10 THEN 'CLEANUP_NEEDED'
            ELSE 'HEALTHY'
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 自动清理僵尸连接函数（Pro权限）
CREATE OR REPLACE FUNCTION terminate_idle_connections(
    idle_threshold_minutes INTEGER DEFAULT 15,
    max_terminations INTEGER DEFAULT 10
)
RETURNS TABLE(
    terminated_count INTEGER,
    remaining_zombies INTEGER,
    details JSONB
) AS $$
DECLARE
    zombie_pids INTEGER[];
    terminated_pids INTEGER[] := '{}';
    current_pid INTEGER;
    termination_count INTEGER := 0;
    error_count INTEGER := 0;
    remaining_count INTEGER;
BEGIN
    -- 获取僵尸连接PID列表
    SELECT array_agg(pid) INTO zombie_pids
    FROM pg_stat_activity 
    WHERE datname = current_database()
        AND pid != pg_backend_pid()
        AND state = 'idle'
        AND state_change < NOW() - (idle_threshold_minutes || ' minutes')::INTERVAL
        AND application_name NOT LIKE '%supabase%'  -- 保护系统连接
    LIMIT max_terminations;
    
    -- 如果没有僵尸连接，直接返回
    IF zombie_pids IS NULL OR array_length(zombie_pids, 1) = 0 THEN
        INSERT INTO connection_logs (event_type, terminated_count, details)
        VALUES ('CLEANUP_NO_ZOMBIES', 0, jsonb_build_object('threshold_minutes', idle_threshold_minutes));
        
        RETURN QUERY
        SELECT 0, 0, jsonb_build_object('message', 'No zombie connections found');
        RETURN;
    END IF;
    
    -- 逐个终止僵尸连接
    FOREACH current_pid IN ARRAY zombie_pids
    LOOP
        BEGIN
            PERFORM pg_terminate_backend(current_pid);
            terminated_pids := terminated_pids || current_pid;
            termination_count := termination_count + 1;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            -- 记录错误但继续处理其他连接
        END;
    END LOOP;
    
    -- 检查剩余僵尸连接数
    SELECT count(*) INTO remaining_count
    FROM pg_stat_activity 
    WHERE datname = current_database()
        AND pid != pg_backend_pid()
        AND state = 'idle'
        AND state_change < NOW() - (idle_threshold_minutes || ' minutes')::INTERVAL;
    
    -- 记录清理事件
    INSERT INTO connection_logs (
        event_type, 
        terminated_count, 
        zombie_count,
        details
    )
    VALUES (
        'CLEANUP_EXECUTED',
        termination_count,
        remaining_count,
        jsonb_build_object(
            'threshold_minutes', idle_threshold_minutes,
            'max_terminations', max_terminations,
            'terminated_pids', terminated_pids,
            'error_count', error_count,
            'total_candidates', array_length(zombie_pids, 1)
        )
    );
    
    RETURN QUERY
    SELECT 
        termination_count,
        remaining_count,
        jsonb_build_object(
            'terminated_pids', terminated_pids,
            'error_count', error_count,
            'threshold_minutes', idle_threshold_minutes
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 紧急连接池重置函数
CREATE OR REPLACE FUNCTION emergency_connection_reset()
RETURNS TABLE(
    action TEXT,
    affected_count INTEGER,
    success BOOLEAN,
    details TEXT
) AS $$
DECLARE
    idle_terminated INTEGER := 0;
    long_running_canceled INTEGER := 0;
    error_msg TEXT;
BEGIN
    -- 第一步：终止长时间空闲连接（5分钟+）
    BEGIN
        SELECT terminated_count INTO idle_terminated
        FROM terminate_idle_connections(5, 20);
        
        RETURN QUERY
        SELECT 'TERMINATE_IDLE', idle_terminated, true, 'Terminated idle connections (5+ minutes)';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RETURN QUERY
        SELECT 'TERMINATE_IDLE', 0, false, error_msg;
    END;
    
    -- 第二步：取消长时间运行的查询（30秒+）
    BEGIN
        WITH long_queries AS (
            SELECT pid
            FROM pg_stat_activity 
            WHERE datname = current_database()
                AND pid != pg_backend_pid()
                AND state = 'active'
                AND query_start < NOW() - INTERVAL '30 seconds'
                AND application_name NOT LIKE '%supabase%'
            LIMIT 10
        )
        SELECT count(*) INTO long_running_canceled
        FROM long_queries
        WHERE pg_cancel_backend(pid);
        
        RETURN QUERY
        SELECT 'CANCEL_LONG_QUERIES', long_running_canceled, true, 'Canceled long-running queries (30+ seconds)';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RETURN QUERY
        SELECT 'CANCEL_LONG_QUERIES', 0, false, error_msg;
    END;
    
    -- 记录紧急重置事件
    INSERT INTO connection_logs (
        event_type, 
        terminated_count, 
        details
    )
    VALUES (
        'EMERGENCY_RESET',
        idle_terminated + long_running_canceled,
        jsonb_build_object(
            'idle_terminated', idle_terminated,
            'queries_canceled', long_running_canceled,
            'timestamp', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 连接池健康检查函数
CREATE OR REPLACE FUNCTION connection_pool_health_check()
RETURNS JSONB AS $$
DECLARE
    health_data RECORD;
    recent_logs JSONB;
    result JSONB;
BEGIN
    -- 获取当前连接状态
    SELECT * INTO health_data FROM connection_health LIMIT 1;
    
    -- 获取最近的日志
    SELECT jsonb_agg(
        jsonb_build_object(
            'event_type', event_type,
            'timestamp', created_at,
            'details', details
        )
    ) INTO recent_logs
    FROM (
        SELECT event_type, created_at, details
        FROM connection_logs 
        ORDER BY created_at DESC 
        LIMIT 10
    ) recent;
    
    -- 构建健康检查结果
    result := jsonb_build_object(
        'status', CASE 
            WHEN health_data.utilization_percentage > 90 THEN 'CRITICAL'
            WHEN health_data.utilization_percentage > 80 THEN 'WARNING'
            WHEN health_data.zombie_connections > 10 THEN 'CLEANUP_NEEDED'
            ELSE 'HEALTHY'
        END,
        'metrics', jsonb_build_object(
            'total_connections', health_data.total_connections,
            'active_connections', health_data.active_connections,
            'idle_connections', health_data.idle_connections,
            'zombie_connections', health_data.zombie_connections,
            'utilization_percentage', health_data.utilization_percentage,
            'max_connections', health_data.max_connections
        ),
        'recommendations', CASE 
            WHEN health_data.utilization_percentage > 90 THEN 
                jsonb_build_array('Execute emergency cleanup', 'Check for connection leaks', 'Consider scaling')
            WHEN health_data.zombie_connections > 10 THEN 
                jsonb_build_array('Run zombie cleanup', 'Review connection timeout settings')
            ELSE 
                jsonb_build_array('System healthy')
        END,
        'recent_events', COALESCE(recent_logs, '[]'::jsonb),
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 创建定时清理任务（需要pg_cron扩展）
-- 注意：这需要在Supabase控制台中启用pg_cron扩展

-- 每5分钟检查连接池健康状态
-- SELECT cron.schedule('connection-health-check', '*/5 * * * *', 'SELECT monitor_connections();');

-- 每15分钟清理僵尸连接
-- SELECT cron.schedule('zombie-cleanup', '*/15 * * * *', 'SELECT terminate_idle_connections(15, 10);');

-- 9. 权限设置（确保应用可以调用这些函数）
-- GRANT EXECUTE ON FUNCTION monitor_connections() TO authenticated;
-- GRANT EXECUTE ON FUNCTION terminate_idle_connections(INTEGER, INTEGER) TO authenticated;
-- GRANT EXECUTE ON FUNCTION emergency_connection_reset() TO authenticated;
-- GRANT EXECUTE ON FUNCTION connection_pool_health_check() TO authenticated;

-- GRANT SELECT ON connection_health TO authenticated;
-- GRANT SELECT ON connection_details TO authenticated;
-- GRANT SELECT, INSERT ON connection_logs TO authenticated;

COMMENT ON TABLE connection_logs IS 'GistFans连接池管理日志 - 记录所有连接池相关事件';
COMMENT ON VIEW connection_health IS 'GistFans连接池健康状态视图 - 实时连接池指标';
COMMENT ON FUNCTION monitor_connections() IS 'GistFans连接监控函数 - 返回详细连接状态';
COMMENT ON FUNCTION terminate_idle_connections(INTEGER, INTEGER) IS 'GistFans僵尸连接清理函数 - Pro权限自动清理';
COMMENT ON FUNCTION emergency_connection_reset() IS 'GistFans紧急连接重置函数 - 危机情况下的连接池恢复';
