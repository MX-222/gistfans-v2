export default function StatusPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-green-600 mb-4">✅ 服务器正在运行</h1>
        <p className="text-gray-600">如果您能看到这个页面，说明服务器工作正常。</p>
        <div className="mt-4 space-y-2">
          <p><strong>时间:</strong> {new Date().toLocaleString()}</p>
          <p><strong>端口:</strong> 检查浏览器地址栏</p>
        </div>
      </div>
    </div>
  )
} 
 