# 生产部署指南

## 构建命令
```bash
npm run build
npm start
```

## 环境变量
```env
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key
GITHUB_ID=your-github-oauth-id
GITHUB_SECRET=your-github-oauth-secret
DATABASE_URL=your-database-url
```

## 部署平台
- Vercel (推荐)
- Netlify
- 自托管服务器

## 数据库
- 生产环境使用 Supabase
- 运行数据库迁移: `npx prisma migrate deploy` 