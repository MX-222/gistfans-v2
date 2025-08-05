import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型，请上传 JPG、PNG、GIF 或 WebP 格式的图片' },
        { status: 400 }
      )
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过 5MB' },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${session.user.id}_${timestamp}_${randomString}.${fileExtension}`

    // 将文件转换为Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 这里我们使用一个简单的方案：将图片转换为base64并存储
    // 在生产环境中，你应该使用云存储服务如AWS S3、Cloudinary等
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`

    // 模拟上传到云存储的URL
    // 在实际应用中，这里应该是真实的云存储URL
    const imageUrl = base64Image

    return NextResponse.json({
      success: true,
      data: {
        url: imageUrl,
        fileName: fileName,
        fileSize: file.size,
        fileType: file.type
      }
    })

  } catch (error) {
    console.error('图片上传失败:', error)
    return NextResponse.json(
      { error: '图片上传失败，请稍后重试' },
      { status: 500 }
    )
  }
}

// 获取上传的图片信息
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 这里可以返回用户上传的图片列表
    // 在实际应用中，你可能需要从数据库查询用户的图片
    return NextResponse.json({
      success: true,
      data: {
        images: [],
        totalSize: 0,
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      }
    })

  } catch (error) {
    console.error('获取图片信息失败:', error)
    return NextResponse.json(
      { error: '获取图片信息失败' },
      { status: 500 }
    )
  }
}
