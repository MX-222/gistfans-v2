---
type: "manual"
---

# AI-4 协作标准

## 任务概述
负责协作工具扩展，包括屏幕共享、实时代码编辑、文件传输、语音通话等高级功能。

## 代码规范

### 1. 文件命名规范
- API路由：`/api/collaboration/[功能]/route.ts`
- 数据库模型：在`prisma/schema-supabase.prisma`中添加
- 服务层：`src/lib/collaborationService.ts`
- 组件：`src/components/collaboration/[组件名].tsx`
- 类型定义：`src/types/collaboration.ts`
- WebRTC工具：`src/utils/webrtc.ts`

### 2. 代码风格
- 使用TypeScript严格模式
- 遵循项目现有的ESLint配置
- 使用Prettier格式化代码
- React组件使用函数式组件 + Hooks
- WebRTC相关函数使用async/await
- 事件处理函数以`handle`开头

### 3. 数据库规范
```prisma
model CollaborationSession {
  id          String   @id @default(cuid())
  hostId      String
  guestId     String?
  type        String   // 'screen_share', 'code_edit', 'file_transfer', 'voice_call'
  status      String   // 'pending', 'active', 'ended'
  settings    Json?    // 会话设置
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // 关联用户表
  host  User @relation("HostSessions", fields: [hostId], references: [id])
  guest User? @relation("GuestSessions", fields: [guestId], references: [id])
}

model FileTransfer {
  id          String   @id @default(cuid())
  sessionId   String
  fileName    String
  fileSize    Int
  fileType    String
  status      String   // 'uploading', 'completed', 'failed'
  progress    Int      @default(0)
  createdAt   DateTime @default(now())
  
  // 关联会话
  session CollaborationSession @relation(fields: [sessionId], references: [id])
}
```

### 4. WebRTC连接规范
```typescript
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  mediaConstraints: MediaStreamConstraints;
  dataChannelOptions: RTCDataChannelInit;
}

export interface CollaborationPeer {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  stream?: MediaStream;
  status: 'connecting' | 'connected' | 'disconnected';
}
```

### 5. 实时通信协议
```typescript
export type CollaborationMessage = 
  | { type: 'join_session'; sessionId: string; userId: string }
  | { type: 'leave_session'; sessionId: string; userId: string }
  | { type: 'screen_share_start'; sessionId: string; streamId: string }
  | { type: 'screen_share_stop'; sessionId: string }
  | { type: 'code_change'; sessionId: string; changes: CodeChange[] }
  | { type: 'file_transfer_start'; sessionId: string; fileInfo: FileInfo }
  | { type: 'file_chunk'; sessionId: string; chunkData: ArrayBuffer }
  | { type: 'voice_call_offer'; sessionId: string; offer: RTCSessionDescription }
  | { type: 'voice_call_answer'; sessionId: string; answer: RTCSessionDescription };
```

## 提交标准

### 1. 分支管理
- 基于`main`分支创建`feature/ai-4-collaboration`分支
- 所有开发在功能分支进行
- 提交前必须通过测试

### 2. 提交信息格式
```
类型(范围): 简短描述

详细描述（可选）

- 变更点1
- 变更点2
```

示例：
```
feat(collaboration): 添加屏幕共享功能

- 实现WebRTC屏幕共享
- 添加屏幕共享控制组件
- 创建会话管理系统
```

### 3. 代码审查检查清单
- [ ] 代码符合TypeScript类型检查
- [ ] 通过ESLint检查
- [ ] WebRTC连接有错误处理
- [ ] 媒体权限正确请求
- [ ] 数据传输有安全验证
- [ ] 包含基本测试用例

## 功能模块规范

### 1. 屏幕共享模块
```typescript
export interface ScreenShareService {
  startScreenShare(sessionId: string): Promise<MediaStream>;
  stopScreenShare(sessionId: string): Promise<void>;
  onScreenShareStart(callback: (stream: MediaStream) => void): void;
  onScreenShareStop(callback: () => void): void;
}
```

### 2. 实时代码编辑模块
```typescript
export interface CodeEditService {
  joinCodeSession(sessionId: string, documentId: string): Promise<void>;
  leaveCodeSession(sessionId: string): Promise<void>;
  applyChanges(changes: CodeChange[]): Promise<void>;
  onCodeChange(callback: (changes: CodeChange[]) => void): void;
}

export interface CodeChange {
  type: 'insert' | 'delete' | 'replace';
  position: { line: number; column: number };
  content: string;
  author: string;
  timestamp: number;
}
```

### 3. 文件传输模块
```typescript
export interface FileTransferService {
  sendFile(sessionId: string, file: File): Promise<string>;
  receiveFile(transferId: string): Promise<Blob>;
  onFileTransferProgress(callback: (progress: TransferProgress) => void): void;
  onFileReceived(callback: (file: ReceivedFile) => void): void;
}
```

### 4. 语音通话模块
```typescript
export interface VoiceCallService {
  startCall(sessionId: string, targetUserId: string): Promise<void>;
  answerCall(sessionId: string): Promise<void>;
  endCall(sessionId: string): Promise<void>;
  toggleMute(): void;
  onCallIncoming(callback: (callInfo: CallInfo) => void): void;
  onCallEnded(callback: () => void): void;
}
```

## 测试要求

### 1. 单元测试
- 为所有服务层函数编写测试
- 模拟WebRTC连接
- 测试数据传输功能
- 验证错误处理

### 2. 集成测试
- 测试完整的协作流程
- 验证多用户协作
- 测试网络中断恢复
- 验证权限控制

### 3. 性能测试
- 测试大文件传输
- 验证屏幕共享性能
- 测试并发连接数
- 监控内存使用

## 协作要求

### 1. 进度报告
- 每日更新`PROGRESS.md`文件
- 记录完成的功能模块
- 标记需要其他AI协助的部分

### 2. 文档更新
- 更新`API_CHANGES.md`记录新增的API
- 在`ISSUES.md`中记录遇到的问题
- 更新相关的README文档

### 3. 与其他AI的协作
- **不要修改**其他AI负责的文件
- 协作功能需要与其他模块集成
- 在`ISSUES.md`中记录集成需求

### 4. 集成点说明
- **与AI-1协作**：协作消费Star系统
- **与AI-2协作**：协作事件触发通知
- **与AI-3协作**：协作工具界面多语言
- **与汇总AI协作**：集成到主应用流程

## UI/UX 规范

### 1. 协作界面设计
- 浮动工具栏设计
- 最小化干扰用户体验
- 清晰的状态指示
- 直观的控制按钮

### 2. 权限请求规范
- 明确说明权限用途
- 优雅的权限拒绝处理
- 提供权限设置指引
- 支持权限重新请求

### 3. 错误处理规范
- 网络连接失败处理
- 媒体设备不可用处理
- 权限被拒绝处理
- 浏览器兼容性处理

## 安全要求

### 1. 数据传输安全
- 所有数据传输使用加密
- 文件传输病毒扫描
- 敏感信息过滤
- 传输日志记录

### 2. 权限控制
- 会话邀请验证
- 用户身份验证
- 操作权限检查
- 会话超时处理

### 3. 隐私保护
- 屏幕共享内容过滤
- 敏感区域自动遮挡
- 录制权限控制
- 数据自动清理

## 性能要求

### 1. 实时性能
- 屏幕共享延迟 < 100ms
- 代码同步延迟 < 50ms
- 语音通话延迟 < 200ms
- 文件传输速度优化

### 2. 资源使用
- CPU使用率 < 30%
- 内存使用合理
- 网络带宽优化
- 电池消耗控制

### 3. 并发支持
- 支持多个协作会话
- 处理网络抖动
- 自动重连机制
- 负载均衡处理

## 浏览器兼容性

### 1. 支持的浏览器
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### 2. 功能降级
- 不支持WebRTC的浏览器
- 移动设备适配
- 低带宽环境优化
- 功能检测和提示

## 完成标准

### 1. 功能完成度
- [ ] 屏幕共享功能已实现
- [ ] 实时代码编辑已实现
- [ ] 文件传输功能已实现
- [ ] 语音通话功能已实现
- [ ] 会话管理系统已完成

### 2. 质量标准
- [ ] 代码通过TypeScript编译
- [ ] 通过ESLint检查
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试全部通过
- [ ] 性能测试达标

### 3. 用户体验
- [ ] 功能响应速度快
- [ ] UI交互流畅
- [ ] 错误处理完善
- [ ] 移动端适配良好

## 技术栈

### 1. 核心技术
- WebRTC：实时通信
- Socket.IO：信令服务
- MediaRecorder：录制功能
- Canvas API：屏幕处理

### 2. 辅助库
- simple-peer：WebRTC封装
- socket.io-client：客户端连接
- file-saver：文件下载
- crypto-js：数据加密

## 最终交付

完成后需要提交：
1. 完整的协作功能代码
2. 协作工具UI组件
3. 测试用例和测试报告
4. 性能测试报告
5. 协作工具使用文档
6. 浏览器兼容性报告 