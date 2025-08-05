"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center space-x-2 text-gray-400 hover:text-white"
    >
      <Globe size={16} />
      <span className="text-sm font-medium">
        {language === 'en' ? 'EN' : '中文'}
      </span>
    </Button>
  )
} 
 