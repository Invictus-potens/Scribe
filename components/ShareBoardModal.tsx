'use client';

import { useState, useEffect } from 'react';
import { companyHelpers, Company } from '../lib/companyHelpers';
import { authHelpers } from '../lib/supabase';

interface ShareBoardModalProps {
  boardId: string;
  boardTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareBoardModal({ boardId, boardTitle, isOpen, onClose }: ShareBoardModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;

      setCurrentUser(user);
      const { data: userCompanies } = await companyHelpers.getCompanies(user.id);
      setCompanies(userCompanies || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedCompany || !currentUser) return;

    setLoading(true);
    try {
      const { error } = await companyHelpers.shareBoardWithCompany(
        boardId,
        selectedCompany,
        currentUser.id
      );

      if (error) {
        console.error('Error sharing board:', error);
        alert('Erro ao compartilhar board');
        return;
      }

      alert('Board compartilhado com sucesso!');
      onClose();
      setSelectedCompany('');
    } catch (error) {
      console.error('Error sharing board:', error);
      alert('Erro ao compartilhar board');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Compartilhar Board
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Fechar"
          >
            <i className="ri-close-line w-5 h-5"></i>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Board: <span className="font-medium text-gray-800 dark:text-gray-200">{boardTitle}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Selecione uma empresa para compartilhar este board:
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Empresa
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              title="Selecionar empresa"
            >
              <option value="">Selecione uma empresa</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {companies.length === 0 && (
            <div className="text-center py-4">
              <i className="ri-building-line w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2"></i>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Você não tem empresas. Crie uma empresa primeiro para compartilhar boards.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleShare}
            disabled={!selectedCompany || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {loading ? 'Compartilhando...' : 'Compartilhar'}
          </button>
        </div>
      </div>
    </div>
  );
} 