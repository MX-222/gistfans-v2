/**
 * 实时数据同步系统
 * 基于WebSocket和Server-Sent Events实现
 */

import { EventEmitter } from 'events'

// 实时事件类型
export enum RealtimeEventType {
  POST_CREATED = 'post:created',
  POST_UPDATED = 'post:updated',
  POST_DELETED = 'post:deleted',
  POST_LIKED = 'post:liked',
  COMMENT_CREATED = 'comment:created',
  COMMENT_UPDATED = 'comment:updated',
  COMMENT_DELETED = 'comment:deleted',
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  CACHE_INVALIDATE = 'cache:invalidate'
}

// 实时事件数据接口
export interface RealtimeEvent {
  type: RealtimeEventType
  data: any
  userId?: string
  timestamp: number
  version: number
  metadata?: Record<string, any>
}

// 连接状态
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * 实时同步客户端
 * 支持WebSocket和SSE两种连接方式
 */
export class RealtimeClient extends EventEmitter {
  private ws: WebSocket | null = null
  private eventSource: EventSource | null = null
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private lastHeartbeat: number = 0

  constructor(
    private config: {
      wsUrl?: string
      sseUrl?: string
      useWebSocket?: boolean
      heartbeatInterval?: number
      maxReconnectAttempts?: number
      reconnectDelay?: number
      authToken?: string
    }
  ) {
    super()
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5
    this.reconnectDelay = config.reconnectDelay || 1000
  }

  /**
   * 连接到实时服务
   */
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) {
      return
    }

    this.setConnectionState(ConnectionState.CONNECTING)

    try {
      if (this.config.useWebSocket && this.config.wsUrl) {
        await this.connectWebSocket()
      } else if (this.config.sseUrl) {
        await this.connectSSE()
      } else {
        throw new Error('No connection URL provided')
      }
    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR)
      this.emit('error', error)
      this.scheduleReconnect()
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.setConnectionState(ConnectionState.DISCONNECTED)
    this.reconnectAttempts = 0

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * 发送事件（仅WebSocket支持）
   */
  send(event: RealtimeEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event))
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send event')
    }
  }

  /**
   * 订阅特定类型的事件
   */
  subscribe(eventType: RealtimeEventType, callback: (data: any) => void): void {
    this.on(eventType, callback)
  }

  /**
   * 取消订阅
   */
  unsubscribe(eventType: RealtimeEventType, callback?: (data: any) => void): void {
    if (callback) {
      this.off(eventType, callback)
    } else {
      this.removeAllListeners(eventType)
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * 获取连接统计信息
   */
  getStats(): {
    state: ConnectionState
    reconnectAttempts: number
    lastHeartbeat: number
    uptime: number
  } {
    return {
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.lastHeartbeat > 0 ? Date.now() - this.lastHeartbeat : 0
    }
  }

  // ========== 私有方法 ==========

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.buildWebSocketUrl()
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected')
        this.setConnectionState(ConnectionState.CONNECTED)
        this.reconnectAttempts = 0
        this.startHeartbeat()
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const realtimeEvent: RealtimeEvent = JSON.parse(event.data)
          this.handleRealtimeEvent(realtimeEvent)
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason)
        this.setConnectionState(ConnectionState.DISCONNECTED)
        this.stopHeartbeat()
        
        if (event.code !== 1000) { // 非正常关闭
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        reject(error)
      }

      // 连接超时
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close()
          reject(new Error('WebSocket connection timeout'))
        }
      }, 10000)
    })
  }

  private async connectSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sseUrl = this.buildSSEUrl()
      this.eventSource = new EventSource(sseUrl)

      this.eventSource.onopen = () => {
        console.log('✅ SSE connected')
        this.setConnectionState(ConnectionState.CONNECTED)
        this.reconnectAttempts = 0
        resolve()
      }

      this.eventSource.onmessage = (event) => {
        try {
          const realtimeEvent: RealtimeEvent = JSON.parse(event.data)
          this.handleRealtimeEvent(realtimeEvent)
        } catch (error) {
          console.error('❌ Failed to parse SSE message:', error)
        }
      }

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error)
        this.setConnectionState(ConnectionState.ERROR)
        this.scheduleReconnect()
      }

      // 连接超时
      setTimeout(() => {
        if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
          this.eventSource.close()
          reject(new Error('SSE connection timeout'))
        }
      }, 10000)
    })
  }

  private buildWebSocketUrl(): string {
    const baseUrl = this.config.wsUrl || 'ws://localhost:3000/api/ws'
    const url = new URL(baseUrl)
    
    if (this.config.authToken) {
      url.searchParams.set('token', this.config.authToken)
    }
    
    return url.toString()
  }

  private buildSSEUrl(): string {
    const baseUrl = this.config.sseUrl || '/api/sse'
    const url = new URL(baseUrl, window.location.origin)
    
    if (this.config.authToken) {
      url.searchParams.set('token', this.config.authToken)
    }
    
    return url.toString()
  }

  private handleRealtimeEvent(event: RealtimeEvent): void {
    console.log('📡 Received realtime event:', event.type, event.data)
    
    // 更新最后心跳时间
    this.lastHeartbeat = Date.now()
    
    // 发射事件给监听器
    this.emit(event.type, event.data, event.metadata)
    this.emit('event', event)
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      const previousState = this.connectionState
      this.connectionState = state
      this.emit('stateChange', state, previousState)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      this.setConnectionState(ConnectionState.ERROR)
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // 指数退避

    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    this.setConnectionState(ConnectionState.RECONNECTING)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 30000 // 30秒
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }))
      }
    }, interval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
}

/**
 * 实时同步管理器
 * 管理多个实时连接和事件分发
 */
export class RealtimeSyncManager {
  private clients: Map<string, RealtimeClient> = new Map()
  private eventBuffer: RealtimeEvent[] = []
  private maxBufferSize: number = 100

  /**
   * 创建实时客户端
   */
  createClient(
    name: string, 
    config: {
      wsUrl?: string
      sseUrl?: string
      useWebSocket?: boolean
      authToken?: string
    }
  ): RealtimeClient {
    const client = new RealtimeClient(config)
    this.clients.set(name, client)
    
    // 监听连接状态变化
    client.on('stateChange', (state) => {
      console.log(`🔄 Client ${name} state changed to:`, state)
    })

    // 缓存事件
    client.on('event', (event: RealtimeEvent) => {
      this.bufferEvent(event)
    })

    return client
  }

  /**
   * 获取客户端
   */
  getClient(name: string): RealtimeClient | undefined {
    return this.clients.get(name)
  }

  /**
   * 广播事件到所有客户端
   */
  broadcast(event: RealtimeEvent): void {
    for (const client of this.clients.values()) {
      if (client.getConnectionState() === ConnectionState.CONNECTED) {
        client.send(event)
      }
    }
  }

  /**
   * 获取事件缓冲区
   */
  getEventBuffer(): RealtimeEvent[] {
    return [...this.eventBuffer]
  }

  /**
   * 清空事件缓冲区
   */
  clearEventBuffer(): void {
    this.eventBuffer = []
  }

  /**
   * 断开所有连接
   */
  disconnectAll(): void {
    for (const client of this.clients.values()) {
      client.disconnect()
    }
    this.clients.clear()
  }

  // ========== 私有方法 ==========

  private bufferEvent(event: RealtimeEvent): void {
    this.eventBuffer.push(event)
    
    // 保持缓冲区大小
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift()
    }
  }
}

// 创建全局实时同步管理器
export const realtimeSyncManager = new RealtimeSyncManager()
