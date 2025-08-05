"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import GistFansLoader from '@/components/GistFansLoader'
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const { t } = useLanguage()

  const getErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case "Configuration":
        return {
          title: t("configuration_error"),
          description: t("oauth_config_error"),
          action: t("contact_support")
        }
      case "AccessDenied":
        return {
          title: t("access_denied"),
          description: t("access_denied_description"),
          action: t("retry")
        }
      case "Verification":
        return {
          title: t("verification_failed"),
          description: t("verification_failed_description"),
          action: t("retry")
        }
      case "OAuthSignin":
        return {
          title: t("github_login_failed"),
          description: t("github_login_failed_description"),
          action: t("retry")
        }
      case "OAuthCallback":
        return {
          title: t("network_connection_problem"),
          description: t("oauth_callback_description"),
          action: t("retry")
        }
      case "OAuthCreateAccount":
        return {
          title: t("account_creation_failed"),
          description: t("account_creation_failed_description"),
          action: t("retry")
        }
      case "EmailCreateAccount":
        return {
          title: t("email_verification_failed"),
          description: t("email_verification_failed_description"),
          action: t("retry")
        }
      case "Callback":
        return {
          title: t("callback_error"),
          description: t("callback_error_description"),
          action: t("retry")
        }
      case "OAuthAccountNotLinked":
        return {
          title: t("account_not_linked"),
          description: t("account_not_linked_description"),
          action: t("retry")
        }
      case "EmailSignin":
        return {
          title: t("email_signin_failed"),
          description: t("email_signin_failed_description"),
          action: t("retry")
        }
      case "CredentialsSignin":
        return {
          title: t("credentials_error"),
          description: t("credentials_error_description"),
          action: t("retry")
        }
      case "SessionRequired":
        return {
          title: t("session_required"),
          description: t("session_required_description"),
          action: t("go_to_login")
        }
      default:
        return {
          title: t("unknown_error"),
          description: t("unknown_error_description"),
          action: t("retry")
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900/50 border-gray-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <CardTitle className="text-2xl text-white">{errorInfo.title}</CardTitle>
          <CardDescription className="text-gray-300 text-base">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-3">
            {error === 'OAuthCallback' ? (
              <Link href="/feed">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                  继续访问应用
                </Button>
              </Link>
            ) : (
              <Link href="/auth/signin">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                  {errorInfo.action}
                </Button>
              </Link>
            )}
            
            <Link href="/">
              <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
                返回首页
              </Button>
            </Link>
          </div>
          
          {error && (
            <div className="mt-6 p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400">
                错误代码: <code className="text-red-400">{error}</code>
              </p>
            </div>
          )}
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-400">
              需要帮助？{" "}
              <a href="mailto:support@gistfans.com" className="text-blue-400 hover:underline">
                联系支持
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return <GistFansLoader />
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorContent />
    </Suspense>
  )
} 