---
type: "manual"
---

# API函数使用规范

## 响应函数标准用法

### createSuccessResponse
```typescript
// 正确用法
createSuccessResponse<T>(data: T, message?: string): ApiResponse<T>

// 示例
createSuccessResponse({
  users: [...],
  pagination: {...},
  duration: 123
}, '查询成功')

// 错误用法 ❌
createSuccessResponse(data, { pagination, duration })
```

### createErrorResponse
```typescript
// 正确用法
createErrorResponse(error: string | ApiError, code?: ErrorCode): ApiResponse

// 示例
createErrorResponse('操作失败: ' + errorMessage, ErrorCode.INTERNAL_ERROR)

// 错误用法 ❌
createErrorResponse(ErrorCode.INTERNAL_ERROR, '操作失败', errorMessage)
```

### createErrorResponseWithCode
```typescript
// 正确用法
createErrorResponseWithCode(code: ErrorCode, message: string): ApiResponse

// 示例
createErrorResponseWithCode(ErrorCode.UNAUTHORIZED, '未授权访问')
```

## 常见错误模式

### 1. 参数顺序错误
- 问题：混淆不同函数的参数顺序
- 解决：严格按照函数签名传参

### 2. 参数数量错误
- 问题：传递了错误数量的参数
- 解决：检查函数定义，使用正确的重载版本

### 3. 类型不匹配
- 问题：传递了错误类型的参数
- 解决：使用TypeScript严格模式，启用类型检查

## 自检清单

在使用API函数前，请检查：
- [ ] 函数名是否正确
- [ ] 参数数量是否匹配
- [ ] 参数顺序是否正确
- [ ] 参数类型是否匹配
- [ ] 是否使用了正确的重载版本
