'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth callback error:', error);
          setError('Erro na autenticação. Tente novamente.');
          return;
        }
        if (data.session) {
          const next = searchParams.get('next') || '/';
          router.push(next);
        } else {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('User error:', userError);
            setError('Erro ao verificar usuário. Tente novamente.');
            return;
          }
          if (user && !user.email_confirmed_at) {
            setError('Por favor, confirme seu email antes de continuar.');
            setTimeout(() => {
              router.push('/');
            }, 3000);
          } else {
            router.push('/');
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Ocorreu um erro inesperado. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };
    handleAuthCallback();
  }, [router, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Processando autenticação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line w-8 h-8 text-red-600 dark:text-red-400"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Erro</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
} 