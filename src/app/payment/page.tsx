"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  CreditCard, 
  Lock, 
  AlertCircle, 
  Clock, 
  Bell,
  CheckCircle,
  Star
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function PaymentPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [isNotifyRequested, setIsNotifyRequested] = useState(false)

  const handleNotifyRequest = () => {
    if (email) {
      setIsNotifyRequested(true)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 导航栏 */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/profile" className="flex items-center space-x-2 text-gray-400 hover:text-white">
                <ArrowLeft size={20} />
                <span>{t('back_to_profile')}</span>
              </Link>
            </div>
            <div className="text-xl font-bold text-white">{t('payment')}</div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-600/20 rounded-full mb-6">
            <Clock size={40} className="text-yellow-400" />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t('under_development')}</h1>
          <p className="text-xl text-gray-400 mb-8">{t('coming_soon')}</p>
          <p className="text-gray-300 max-w-2xl mx-auto">
            {t('payment_feature_desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：功能预览 */}
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <CreditCard size={20} className="text-blue-400" />
                  <span>Payment Features</span>
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Secure Payment Processing</div>
                    <div className="text-sm text-gray-400">Industry-standard encryption and security</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Multiple Payment Methods</div>
                    <div className="text-sm text-gray-400">Credit cards, PayPal, and more</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Subscription Management</div>
                    <div className="text-sm text-gray-400">Easy subscription and billing management</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Instant Access</div>
                    <div className="text-sm text-gray-400">Immediate access to premium content</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Lock size={20} className="text-green-400" />
                  <span>Security & Privacy</span>
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">PCI DSS Compliant</div>
                    <div className="text-sm text-gray-400">Meets payment industry security standards</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">SSL Encryption</div>
                    <div className="text-sm text-gray-400">All transactions are encrypted</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">No Stored Payment Data</div>
                    <div className="text-sm text-gray-400">Your payment information is never stored</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：通知订阅 */}
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Bell size={20} className="text-blue-400" />
                  <span>{t('notify_when_ready')}</span>
                </h3>
              </CardHeader>
              <CardContent>
                {!isNotifyRequested ? (
                  <div className="space-y-4">
                    <p className="text-gray-300">
                      Get notified when payment features are available. We'll send you an email as soon as you can start subscribing to your favorite developers.
                    </p>
                    <div className="space-y-3">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="bg-gray-800 border-gray-700"
                      />
                      <Button
                        onClick={handleNotifyRequest}
                        disabled={!email}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Bell size={16} className="mr-2" />
                        Notify Me
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold mb-2">You're all set!</h4>
                    <p className="text-gray-300">
                      We'll notify you at <span className="text-blue-400">{email}</span> when payment features are ready.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 预览订阅方案 */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Star size={20} className="text-yellow-400" />
                  <span>Coming Soon: Subscription Plans</span>
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">Basic Plan</div>
                      <div className="text-sm text-gray-400">Access to basic content</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-400">$9</div>
                      <div className="text-xs text-gray-400">/month</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg border border-blue-600/30">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">Premium Plan</div>
                      <div className="text-sm text-gray-400">Full access + priority support</div>
                      <div className="text-xs text-blue-400 mt-1">Most Popular</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-400">$29</div>
                      <div className="text-xs text-gray-400">/month</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">1-on-1 Consultation</div>
                      <div className="text-sm text-gray-400">Personal mentoring session</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-400">$59</div>
                      <div className="text-xs text-gray-400">/hour</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-400 mb-4">
            <AlertCircle size={16} />
            <span className="text-sm">
              This is a demo version. No actual payments will be processed.
            </span>
          </div>
          <div className="space-x-4">
            <Link href="/profile">
              <Button variant="outline" className="border-gray-600">
                {t('back_to_profile')}
              </Button>
            </Link>
            <Link href="/feed">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Back to Feed
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 
 