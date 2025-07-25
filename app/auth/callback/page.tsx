'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AuthCallback() {
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
          // User is authenticated, redirect to the main app
          const next = searchParams.get('next') || '/';
          router.push(next);
        } else {
          // Check if this is an email confirmation
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('User error:', userError);
            setError('Erro ao verificar usuário. Tente novamente.');
            return;
          }

          if (user && !user.email_confirmed_at) {
            // Email not confirmed yet
            setError('Por favor, confirme seu email antes de continuar.');
            setTimeout(() => {
              router.push('/');
            }, 3000);
          } else {
            // No session and no user, redirect to login
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line w-8 h-8 text-white animate-spin"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Processando...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Aguarde enquanto processamos sua autenticação
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line w-8 h-8 text-red-600 dark:text-red-400"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Erro na Autenticação
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return null;
} 