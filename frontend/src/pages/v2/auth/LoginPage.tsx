import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { AuroraBackground } from '@/components/monomi/AuroraBackground'
import { GlassPanel } from '@/components/monomi/GlassPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/auth'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setErrorMessage(null)
      login(data.user, data.access_token, data.refresh_token, data.expires_in)
      navigate('/v2')
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.message || t('auth.invalidCredentials', 'Email atau password salah')
      )
    },
  })

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <AuroraBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <GlassPanel className="w-full max-w-[440px]">
          {/* Brand */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[var(--text-primary)]">
              monomi
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Creative Studio Management
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[var(--text-primary)]">
                {t('auth.email', 'Email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                {...register('email')}
                className="border-input bg-input/50 placeholder:text-[var(--text-tertiary)]"
                disabled={loginMutation.isPending}
              />
              {errors.email && (
                <p className="text-xs text-[var(--danger)]">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[var(--text-primary)]">
                {t('auth.password', 'Password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="border-input bg-input/50 placeholder:text-[var(--text-tertiary)]"
                disabled={loginMutation.isPending}
              />
              {errors.password && (
                <p className="text-xs text-[var(--danger)]">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.signIn', 'Masuk')}...
                  </>
                ) : (
                  t('auth.signIn', 'Masuk')
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-[var(--text-tertiary)]">
              © Monomi Agency
            </p>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}

export default LoginPage
