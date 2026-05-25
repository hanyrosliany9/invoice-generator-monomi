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
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <AuroraBackground />

      {/* Editorial footer label, top-right — signals "this is a real product" */}
      <div className="absolute top-6 right-8 z-10 text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
        Monomi Studio · 2026
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <GlassPanel surface="strong" padding="lg" className="w-full max-w-[420px]">
          {/* Brand block — wordmark first, supporting line beneath a hairline */}
          <div className="mb-8">
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary mb-2">
              Masuk
            </div>
            <h1 className="text-[40px] leading-none font-display font-semibold text-text-primary tracking-tight">
              monomi
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px w-8 bg-brand-cream/40" />
              <p className="text-xs text-text-secondary">
                Creative Studio Management
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-md border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-xs text-danger">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('auth.email', 'Email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@monomi.id"
                {...register('email')}
                className="bg-bg-sunken border-border-default text-text-primary placeholder:text-text-tertiary focus-visible:border-accent-navy-ring focus-visible:ring-accent-navy-ring/40"
                disabled={loginMutation.isPending}
              />
              {errors.email && (
                <p className="text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('auth.password', 'Password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="bg-bg-sunken border-border-default text-text-primary placeholder:text-text-tertiary focus-visible:border-accent-navy-ring focus-visible:ring-accent-navy-ring/40"
                disabled={loginMutation.isPending}
              />
              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-10 bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium"
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

          <div className="mt-8 pt-5 border-t border-border-subtle text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              © Monomi Agency
            </p>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}

export default LoginPage
