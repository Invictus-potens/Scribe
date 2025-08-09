'use client';

import { useState, useEffect } from 'react';
import { companyHelpers, Company, CompanyMember } from '../lib/companyHelpers';
import { authHelpers } from '../lib/supabase';

export default function CompanyManager() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [memberOps, setMemberOps] = useState<Record<string, 'role' | 'remove' | null>>({});
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editCompany, setEditCompany] = useState<{ name: string; description: string }>({ name: '', description: '' });
  
  const [newCompany, setNewCompany] = useState({
    name: '',
    description: ''
  });
  
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member' as 'admin' | 'member'
  });
  const [banner, setBanner] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) return;

        setCurrentUser(user);
        const { data: userCompanies } = await companyHelpers.getCompanies(user.id);
        setCompanies(userCompanies || []);
      } catch (error) {
        console.error('Error loading companies:', error);
        setBanner({ type: 'error', text: 'Erro ao carregar empresas.' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim() || !currentUser) return;

    try {
      const { data, error } = await companyHelpers.createCompany(
        currentUser.id,
        newCompany.name,
        newCompany.description
      );

      if (error) {
        console.error('Error creating company:', error);
        setBanner({ type: 'error', text: 'Erro ao criar empresa.' });
        return;
      }

      // Verificar se data não é null antes de adicionar ao array
      if (data) {
        setCompanies(prev => [data, ...prev]);
        setShowCreateModal(false);
        setNewCompany({ name: '', description: '' });
        setBanner({ type: 'success', text: 'Empresa criada com sucesso.' });
      }
    } catch (error) {
      console.error('Error creating company:', error);
      setBanner({ type: 'error', text: 'Erro inesperado ao criar empresa.' });
    }
  };

  const handleInviteUser = async () => {
    if (!inviteData.email.trim() || !selectedCompany) return;

    try {
      const result = await companyHelpers.inviteUserToCompany(
        selectedCompany.id,
        inviteData.email,
        inviteData.role
      );

      if (result.success) {
        setShowInviteModal(false);
        setInviteData({ email: '', role: 'member' });
        // Reload company members
        const { data: members } = await companyHelpers.getCompanyMembers(selectedCompany.id);
        setCompanyMembers(members || []);
        setBanner({ type: 'success', text: 'Convite enviado com sucesso.' });
      } else {
        console.warn('Invite failed:', result.message);
        setBanner({ type: 'info', text: result.message || 'Não foi possível enviar o convite.' });
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      setBanner({ type: 'error', text: 'Erro ao convidar usuário.' });
    }
  };

  const handleViewMembers = async (company: Company) => {
    setSelectedCompany(company);
    // Prepare edit form with current company values
    setEditCompany({ name: company.name, description: company.description || '' });
    try {
      const { data: members } = await companyHelpers.getCompanyMembers(company.id);
      setCompanyMembers(members || []);
    } catch (error) {
      console.error('Error loading members:', error);
      setBanner({ type: 'error', text: 'Erro ao carregar membros.' });
    }
  };

  const currentUserRole = selectedCompany
    ? companyMembers.find(m => m.user_id === currentUser?.id)?.role
    : undefined;

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleChangeMemberRole = async (member: CompanyMember, role: 'admin' | 'member') => {
    if (!selectedCompany || !canManageMembers) return;
    if (member.role === 'owner') return;
    setMemberOps(prev => ({ ...prev, [member.id]: 'role' }));
    try {
      const { error } = await companyHelpers.updateMemberRole(selectedCompany.id, member.user_id, role);
      if (error) throw error;
      setCompanyMembers(prev => prev.map(m => m.id === member.id ? { ...m, role } : m));
    } catch (e) {
      console.error('Erro ao alterar função do membro', e);
      setBanner({ type: 'error', text: 'Erro ao alterar função do membro.' });
    } finally {
      setMemberOps(prev => ({ ...prev, [member.id]: null }));
    }
  };

  const handleRemoveMember = async (member: CompanyMember) => {
    if (!selectedCompany || !canManageMembers) return;
    if (member.role === 'owner') return;
    setMemberOps(prev => ({ ...prev, [member.id]: 'remove' }));
    try {
      const { error } = await companyHelpers.removeMember(selectedCompany.id, member.user_id);
      if (error) throw error;
      setCompanyMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (e) {
      console.error('Erro ao remover membro', e);
      setBanner({ type: 'error', text: 'Erro ao remover membro.' });
    } finally {
      setMemberOps(prev => ({ ...prev, [member.id]: null }));
    }
  };

  const handleUpdateCompany = async () => {
    if (!selectedCompany) return;
    const newName = editCompany.name.trim();
    const newDesc = editCompany.description.trim();
    if (!newName) return;

    try {
      const { data, error } = await companyHelpers.updateCompany(selectedCompany.id, newName, newDesc);
      if (error) return;
      if (data) {
        setCompanies(prev => prev.map(c => (c.id === data.id ? { ...c, name: data.name, description: data.description } : c)));
        setSelectedCompany({ ...selectedCompany, name: data.name, description: data.description } as Company);
        setShowEditCompanyModal(false);
      }
    } catch (e) {
      console.error('Erro ao atualizar empresa', e);
      setBanner({ type: 'error', text: 'Erro ao atualizar empresa.' });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line w-4 h-4 text-white animate-spin"></i>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Gerenciar Empresas</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <i className="ri-add-line w-4 h-4"></i>
          <span>Nova Empresa</span>
        </button>
      </div>

      {banner && (
        <div className={`mx-6 mt-3 rounded-md p-3 text-sm ${banner.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : banner.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'}`}>
          <div className="flex items-center justify-between">
            <span>{banner.text}</span>
            <button onClick={() => setBanner(null)} className="ml-4 text-xs opacity-70 hover:opacity-100">Fechar</button>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map(company => (
            <div key={company.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{company.name}</h3>
                  {company.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{company.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewMembers(company)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title="Ver membros"
                  >
                    <i className="ri-team-line w-4 h-4"></i>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCompany(company);
                      setShowInviteModal(true);
                    }}
                    className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                    title="Convidar usuário"
                  >
                    <i className="ri-user-add-line w-4 h-4"></i>
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Criada em {new Date(company.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-building-line w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"></i>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Nenhuma Empresa</h3>
            <p className="text-gray-500 dark:text-gray-400">Crie sua primeira empresa para começar a colaborar</p>
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Nova Empresa</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Digite o nome da empresa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
                <textarea
                  value={newCompany.description}
                  onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  rows={3}
                  placeholder="Descrição da empresa"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCompany}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Criar Empresa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Convidar para {selectedCompany.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email do Usuário</label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="usuario@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Função</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as 'admin' | 'member' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  title="Selecionar função"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleInviteUser}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Enviar Convite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Members Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Membros de {selectedCompany.name}
              </h3>
              <div className="flex items-center space-x-2">
                {currentUserRole === 'owner' && (
                  <button
                    onClick={() => setShowEditCompanyModal(true)}
                    className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                    title="Editar empresa"
                  >
                    <i className="ri-edit-2-line w-5 h-5"></i>
                  </button>
                )}
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Fechar"
                >
                  <i className="ri-close-line w-5 h-5"></i>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {companyMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                      {member.user_id === currentUser?.id ? 'Você' : `Usuário ${member.user_id.slice(0, 8)}`}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {member.status === 'pending' ? 'Pendente' : 'Ativo'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {canManageMembers && member.role !== 'owner' ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeMemberRole(member, e.target.value as 'admin' | 'member')}
                        disabled={memberOps[member.id] === 'role'}
                        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        title="Alterar função"
                      >
                        <option value="member">Membro</option>
                        <option value="admin">Administrador</option>
                      </select>
                    ) : (
                      <span className="text-xs text-gray-500">{member.role}</span>
                    )}
                    {canManageMembers && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        disabled={memberOps[member.id] === 'remove'}
                        className="p-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                        title="Remover membro"
                      >
                        <i className="ri-user-unfollow-line w-4 h-4"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {companyMembers.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700 rounded">Nenhum membro ainda.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal (owner only) */}
      {showEditCompanyModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Editar Empresa</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  value={editCompany.name}
                  onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Digite o nome da empresa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
                <textarea
                  value={editCompany.description}
                  onChange={(e) => setEditCompany({ ...editCompany, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  rows={3}
                  placeholder="Descrição da empresa"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditCompanyModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateCompany}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}