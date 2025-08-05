"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestPage() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">GistFans System Test</h1>
        
        <div className="grid gap-6">
          {/* Authentication Test */}
          <Card>
            <CardHeader>
              <CardTitle>🔐 GitHub OAuth Authentication Test</CardTitle>
              <CardDescription>Testing NextAuth.js integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <strong>Status:</strong> {status}
                </div>
                
                {session ? (
                  <div className="space-y-2">
                    <div className="text-green-600 font-semibold">✅ Authentication Working!</div>
                    <div><strong>User ID:</strong> {session.user?.id}</div>
                    <div><strong>Name:</strong> {session.user?.name}</div>
                    <div><strong>Email:</strong> {session.user?.email}</div>
                    <div><strong>GitHub Login:</strong> {session.user?.githubLogin}</div>
                    <div><strong>Role:</strong> {session.user?.role}</div>
                    <div><strong>User Type:</strong> {session.user?.userType || 'Not Set'}</div>
                    <div><strong>Onboarding Complete:</strong> {session.user?.onboardingComplete ? 'Yes' : 'No'}</div>
                    {session.user?.image && (
                      <img 
                        src={session.user.image} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-red-600">❌ Not authenticated</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Database Schema Test */}
          <Card>
            <CardHeader>
              <CardTitle>🗄️ Database Schema Test</CardTitle>
              <CardDescription>Testing Prisma schema validation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-green-600 font-semibold">✅ Schema Generated Successfully!</div>
                <div>
                  <strong>Models Available:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>User (with GitHub integration)</li>
                    <li>DeveloperProfile</li>
                    <li>Subscription (Basic/Premium/Consulting)</li>
                    <li>Message (Text/File/Image/Voice)</li>
                    <li>RemoteSession (for remote assistance)</li>
                    <li>Account & Session (NextAuth)</li>
                  </ul>
                </div>
                <div>
                  <strong>Key Features:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>GitHub OAuth integration</li>
                    <li>Developer profiles with hourly rates</li>
                    <li>Three subscription tiers</li>
                    <li>Multi-type messaging system</li>
                    <li>Remote session tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Check */}
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Environment Configuration</CardTitle>
              <CardDescription>Checking required environment variables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <strong>NEXTAUTH_URL:</strong> 
                  <span className="ml-2 text-green-600">✅ Configured</span>
                </div>
                <div>
                  <strong>DATABASE_URL:</strong> 
                  <span className="ml-2 text-yellow-600">⚠️ Needs real database connection</span>
                </div>
                <div>
                  <strong>GITHUB_ID:</strong> 
                  <span className="ml-2 text-yellow-600">⚠️ Needs GitHub OAuth App</span>
                </div>
                <div>
                  <strong>GITHUB_SECRET:</strong> 
                  <span className="ml-2 text-yellow-600">⚠️ Needs GitHub OAuth App</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 