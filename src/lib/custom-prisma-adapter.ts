import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import type { Adapter } from "next-auth/adapters"

export function CustomPrismaAdapter(prisma: PrismaClient): Adapter {
  const baseAdapter = PrismaAdapter(prisma)
  
  return {
    ...baseAdapter,
    
    async linkAccount(account: any) {
      console.log('🔗 LinkAccount 调用:', account)
      
      try {
        // 调用原始的linkAccount方法
        return await baseAdapter.linkAccount!(account)
      } catch (error: any) {
        console.error('❌ LinkAccount 错误:', error)
        
        // 如果是GitHub账户，尝试查找现有用户并链接
        if (account.provider === 'github') {
          console.log('🐱 尝试GitHub账户自动链接')
          
          try {
            // 通过providerId查找用户
            const user = await prisma.user.findUnique({
              where: { id: account.userId }
            })
            
            if (user) {
              console.log('👤 找到用户，尝试创建账户链接')
              
              // 直接创建账户记录
              const newAccount = await prisma.account.create({
                data: {
                  userId: user.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                }
              })
              
              console.log('✅ GitHub账户链接成功')
              return newAccount
            }
          } catch (linkError) {
            console.error('❌ GitHub账户链接失败:', linkError)
            throw error // 重新抛出原始错误
          }
        }
        
        throw error
      }
    },
    
    async createUser(user: any) {
      console.log('👤 CreateUser 调用:', user)

      try {
        // 检查邮箱是否已存在
        if (user.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { starBalance: true }
          })

          if (existingUser) {
            console.log('🔄 用户已存在，返回现有用户:', existingUser.email)

            // 🔧 关键修复：为现有GitHub用户更新引导状态
            if (!existingUser.onboardingComplete) {
              console.log('🔧 为现有GitHub用户完成引导设置')
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  userType: existingUser.userType || 'CODER',
                  onboardingComplete: true,
                  updatedAt: new Date()
                }
              })
            }

            // 如果用户存在但没有StarBalance，创建一个
            if (!existingUser.starBalance) {
              console.log('⭐ 为现有用户创建StarBalance')
              await prisma.starBalance.create({
                data: {
                  userId: existingUser.id,
                  totalStars: 10,
                  availableStars: 10,
                  dailyEarned: 0,
                  maxDailyBasic: 3,
                  lastLoginDate: new Date()
                }
              })
            }

            // 返回更新后的用户信息
            return await prisma.user.findUnique({
              where: { id: existingUser.id },
              include: { starBalance: true }
            }) || existingUser
          }
        }

        // 使用事务创建新用户和StarBalance
        const result = await prisma.$transaction(async (tx) => {
          // 创建新用户
          const newUser = await tx.user.create({
            data: {
              name: user.name,
              email: user.email,
              image: user.image,
              emailVerified: user.emailVerified,
              // GitHub用户默认设置
              isVerified: true,
              role: user.email === 'cmbdlobefxijuf@gmail.com' ? 'ADMIN' : 'USER',
              // 🔧 关键修复：GitHub用户默认完成引导
              userType: 'CODER',
              onboardingComplete: true
            }
          })

          // 为新用户创建StarBalance
          await tx.starBalance.create({
            data: {
              userId: newUser.id,
              totalStars: 10, // 新用户初始10个Star
              availableStars: 10,
              dailyEarned: 0,
              maxDailyBasic: 3,
              lastLoginDate: new Date()
            }
          })

          console.log('✅ 新用户和StarBalance创建成功:', newUser.email)
          return newUser
        })

        return result

      } catch (error) {
        console.error('❌ CreateUser 错误:', error)
        throw error
      }
    },
    
    async getUserByEmail(email) {
      console.log('📧 GetUserByEmail 调用:', email)
      
      const user = await prisma.user.findUnique({
        where: { email }
      })
      
      if (user) {
        console.log('✅ 通过邮箱找到用户:', user.id)
      } else {
        console.log('❌ 未通过邮箱找到用户')
      }
      
      return user as any
    },
    
    async getUserByAccount({ providerAccountId, provider }) {
      console.log('🔍 GetUserByAccount 调用:', { provider, providerAccountId })
      
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        select: { user: true }
      })
      
      if (account?.user) {
        console.log('✅ 通过账户找到用户:', account.user.id)
      } else {
        console.log('❌ 未通过账户找到用户')
      }
      
      return (account?.user ?? null) as any
    }
  }
} 