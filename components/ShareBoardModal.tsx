'use client';

import { useState, useEffect } from 'react';
import { companyHelpers, Company, type BoardPermissions } from '../lib/companyHelpers';
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
  const [perms, setPerms] = useState<BoardPermissions>({
    view_board: true,
    manage_board: false,
    manage_columns: true,
    create_card: true,
    edit_card: true,
    move_card: true,
    delete_card: false,
    manage_members: false
  });
  const [banner, setBanner] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [preset, setPreset] = useState<'visualizador' | 'colaborador' | 'administrador' | 'custom'>('colaborador');

  const PRESETS: Record<'visualizador' | 'colaborador' | 'administrador', BoardPermissions> = {
    visualizador: {
      view_board: true,
      manage_board: false,
      manage_columns: false,
      create_card: false,
      edit_card: false,
      move_card: false,
      delete_card: false,
      manage_members: false
    },
    colaborador: {
      view_board: true,
      manage_board: false,
      manage_columns: false,
      create_card: true,
      edit_card: true,
      move_card: true,
      delete_card: false,
      manage_members: false
    },
    administrador: {
      view_board: true,
      manage_board: true,
      manage_columns: true,
      create_card: true,
      edit_card: true,
      move_card: true,
      delete_card: true,
      manage_members: true
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
      // Define preset padrão ao abrir e aplica os valores do preset
      setPreset('colaborador');
      setPerms(PRESETS.colaborador);
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
        currentUser.id,
        perms
      );

      if (error) {
        console.error('Error sharing board:', error);
        setBanner({ type: 'error', text: 'Erro ao compartilhar board.' });
        return;
      }

      setBanner({ type: 'success', text: 'Board compartilhado com sucesso.' });
      onClose();
      setSelectedCompany('');
      setPerms({
        view_board: true,
        manage_board: false,
        manage_columns: true,
        create_card: true,
        edit_card: true,
        move_card: true,
        delete_card: false,
        manage_members: false
      });
    } catch (error) {
      console.error('Error sharing board:', error);
      setBanner({ type: 'error', text: 'Erro ao compartilhar board.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
        {banner && (
          <div className={`mb-3 rounded-md p-2 text-sm ${banner.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : banner.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'}`}>
            <div className="flex items-center justify-between">
              <span>{banner.text}</span>
              <button onClick={() => setBanner(null)} className="ml-4 text-xs opacity-70 hover:opacity-100">Fechar</button>
            </div>
          </div>
        )}
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
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Perfil de acesso
            </label>
            <select
              value={preset}
              onChange={(e) => {
                const value = e.target.value as 'visualizador' | 'colaborador' | 'administrador' | 'custom';
                setPreset(value);
                if (value !== 'custom') {
                  setPerms(PRESETS[value]);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              title="Selecionar perfil de acesso"
            >
              <option value="visualizador">Visualizador (somente leitura)</option>
              <option value="colaborador">Colaborador (editar e mover cards)</option>
              <option value="administrador">Administrador (acesso total)</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div className="mt-4 space-y-3">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Permissões</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={perms.view_board} onChange={(e) => { setPerms({ ...perms, view_board: e.target.checked }); setPreset('custom'); }} />
                Ver board
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={perms.manage_board} onChange={(e) => { setPerms({ ...perms, manage_board: e.target.checked }); setPreset('custom'); }} />
                Gerenciar board
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={perms.manage_columns} onChange={(e) => { setPerms({ ...perms, manage_columns: e.target.checked }); setPreset('custom'); }} />
                Gerenciar colunas
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={perms.create_card} onChange={(e) => { setPerms({ ...perms, create_card: e.target.checked }); setPreset('custom'); }} />
                Criar cards
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={perms.edit_card} onChange={(e) => { setPerms({ ...perms, edit_card: e.target.checked }); setPreset('custom'); }} />
                Editar cards
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={perms.move_card} onChange={(e) => { setPerms({ ...perms, move_card: e.target.checked }); setPreset('custom'); }} />
                Mover cards
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={perms.delete_card} onChange={(e) => { setPerms({ ...perms, delete_card: e.target.checked }); setPreset('custom'); }} />
                Excluir cards
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={perms.manage_members} onChange={(e) => { setPerms({ ...perms, manage_members: e.target.checked }); setPreset('custom'); }} />
                Gerenciar membros
              </label>
            </div>
          </div>
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