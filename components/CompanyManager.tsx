'use client';

import { useState, useEffect } from 'react';
import { useI18n } from './I18nProvider';
import { companyHelpers, Company, CompanyMember } from '../lib/companyHelpers';
import { authHelpers } from '../lib/supabase';

export default function CompanyManager() {
  const { t } = useI18n();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'owner' | 'admin' | 'member' | 'pending' | 'accepted' | 'declined'>('all');
  const [memberSort, setMemberSort] = useState<'name' | 'role' | 'status' | 'invited_at'>('invited_at');
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
    if (!showCreateModal && !showInviteModal && !showEditCompanyModal && !showMembersModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowInviteModal(false);
        setShowEditCompanyModal(false);
        setShowMembersModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCreateModal, showInviteModal, showEditCompanyModal, showMembersModal]);

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
        setCompanies((prev: Company[]) => [data, ...prev]);
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
      // mostrar detalhes se existirem
      const errMsg = (error as any)?.message || 'Erro ao convidar usuário.';
      setBanner({ type: 'error', text: errMsg });
    }
  };

  const handleViewMembers = async (company: Company) => {
    setSelectedCompany(company);
    setShowInviteModal(false);
    // Prepare edit form with current company values
    setEditCompany({ name: company.name, description: company.description || '' });
    try {
      const [{ data: members }, { data: logs }] = await Promise.all([
        companyHelpers.getCompanyMembers(company.id),
        companyHelpers.getCompanyAuditLogs(company.id)
      ]);
      setCompanyMembers(members || []);
      setAuditLogs(logs || []);
      setShowMembersModal(true);
    } catch (error) {
      console.error('Error loading members:', error);
      setBanner({ type: 'error', text: 'Erro ao carregar membros.' });
    }
  };

  const currentUserRole = selectedCompany
    ? companyMembers.find((m: CompanyMember) => m.user_id === currentUser?.id)?.role
    : undefined;

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleChangeMemberRole = async (member: CompanyMember, role: 'admin' | 'member') => {
    if (!selectedCompany || !canManageMembers) return;
    if (member.role === 'owner') return;
    setMemberOps((prev: Record<string, 'role' | 'remove' | null>) => ({ ...prev, [member.id]: 'role' }));
    try {
      const { error } = await companyHelpers.updateMemberRole(selectedCompany.id, member.user_id, role);
      if (error) throw error;
      setCompanyMembers((prev: CompanyMember[]) => prev.map((m: CompanyMember) => m.id === member.id ? { ...m, role } : m));
    } catch (e) {
      console.error('Erro ao alterar função do membro', e);
      setBanner({ type: 'error', text: 'Erro ao alterar função do membro.' });
    } finally {
      setMemberOps((prev: Record<string, 'role' | 'remove' | null>) => ({ ...prev, [member.id]: null }));
    }
  };

  const handleRemoveMember = async (member: CompanyMember) => {
    if (!selectedCompany || !canManageMembers) return;
    if (member.role === 'owner') return;
    setMemberOps((prev: Record<string, 'role' | 'remove' | null>) => ({ ...prev, [member.id]: 'remove' }));
    try {
      const { error } = await companyHelpers.removeMember(selectedCompany.id, member.user_id);
      if (error) throw error;
      setCompanyMembers((prev: CompanyMember[]) => prev.filter((m: CompanyMember) => m.id !== member.id));
    } catch (e) {
      console.error('Erro ao remover membro', e);
      setBanner({ type: 'error', text: 'Erro ao remover membro.' });
    } finally {
      setMemberOps((prev: Record<string, 'role' | 'remove' | null>) => ({ ...prev, [member.id]: null }));
    }
  };

  const handleResendInvite = async (member: CompanyMember) => {
    if (!selectedCompany) return;
    if (member.status !== 'pending') return;
    try {
      // Reenviar convite: chamar invite novamente pelo email conhecido
      if (!member.user_email) return;
      const result = await companyHelpers.inviteUserToCompany(selectedCompany.id, member.user_email, (member.role === 'admin' ? 'admin' : 'member'));
      if (!result.success) {
        setBanner({ type: 'error', text: result.message || 'Falha ao reenviar convite.' });
        return;
      }
      setBanner({ type: 'success', text: 'Convite reenviado.' });
      const { data: logs } = await companyHelpers.getCompanyAuditLogs(selectedCompany.id);
      setAuditLogs(logs || []);
    } catch (e) {
      console.error(e);
      setBanner({ type: 'error', text: 'Erro ao reenviar convite.' });
    }
  };

  const handleRevokeInvite = async (member: CompanyMember) => {
    if (!selectedCompany) return;
    if (member.status !== 'pending') return;
    try {
      const { error } = await companyHelpers.revokeInvitation(selectedCompany.id, member.user_id);
      if (error) { setBanner({ type: 'error', text: 'Erro ao revogar convite.' }); return; }
      setCompanyMembers(prev => prev.filter(m => m.id !== member.id));
      setBanner({ type: 'success', text: 'Convite revogado.' });
      const { data: logs } = await companyHelpers.getCompanyAuditLogs(selectedCompany.id);
      setAuditLogs(logs || []);
    } catch (e) {
      console.error(e);
      setBanner({ type: 'error', text: 'Erro inesperado ao revogar convite.' });
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
        setCompanies((prev: Company[]) => prev.map((c: Company) => (c.id === data.id ? { ...c, name: data.name, description: data.description } : c)));
        setSelectedCompany({ ...selectedCompany, name: data.name, description: data.description } as Company);
        setShowEditCompanyModal(false);
      }
    } catch (e) {
      console.error('Erro ao atualizar empresa', e);
      setBanner({ type: 'error', text: 'Erro ao atualizar empresa.' });
    }
  };

  const handleTransferOwnership = async (target: CompanyMember) => {
    if (!selectedCompany) return;
    if (currentUserRole !== 'owner') return;
    if (target.user_id === currentUser?.id) return;
    try {
      const ok = typeof window !== 'undefined' ? window.confirm(`Transferir propriedade para ${target.user_full_name || target.user_email || target.user_id.slice(0,8)}?`) : true;
      if (!ok) return;
      const { success, message } = await companyHelpers.transferCompanyOwnership(selectedCompany.id, target.user_id);
      if (!success) {
        setBanner({ type: 'error', text: message || 'Falha ao transferir propriedade' });
        return;
      }
      setBanner({ type: 'success', text: 'Propriedade transferida com sucesso.' });
      // Recarregar membros e company
      const { data: members } = await companyHelpers.getCompanyMembers(selectedCompany.id);
      setCompanyMembers(members || []);
      setSelectedCompany(c => c ? { ...c, owner_id: target.user_id } as any : c);
    } catch (e) {
      console.error(e);
      setBanner({ type: 'error', text: 'Erro inesperado ao transferir propriedade.' });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line w-4 h-4 text-white animate-spin"></i>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{t('companies.loading') ?? 'Carregando empresas...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('companies.manage') ?? 'Gerenciar Empresas'}</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <i className="ri-add-line w-4 h-4"></i>
          <span>{t('companies.new') ?? 'Nova Empresa'}</span>
        </button>
      </div>

      {banner && (
        <div className={`mx-6 mt-3 rounded-md p-3 text-sm ${banner.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : banner.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'}`}>
          <div className="flex items-center justify-between">
            <span>{banner.text}</span>
            <button onClick={() => setBanner(null)} className="ml-4 text-xs opacity-70 hover:opacity-100">{t('common.close') ?? 'Fechar'}</button>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company: Company) => (
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
                      setShowMembersModal(false);
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
                {t('companies.createdAt') ?? 'Criada em'} {new Date(company.created_at).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </div>
            </div>
          ))}
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-building-line w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"></i>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">{t('companies.none') ?? 'Nenhuma Empresa'}</h3>
            <p className="text-gray-500 dark:text-gray-400">{t('companies.createFirst') ?? 'Crie sua primeira empresa para começar a colaborar'}</p>
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('companies.new') ?? 'Nova Empresa'}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('companies.name') ?? 'Nome da Empresa'}</label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder={t('companies.namePlaceholder') ?? 'Digite o nome da empresa'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('companies.description') ?? 'Descrição (opcional)'}</label>
                <textarea
                  value={newCompany.description}
                  onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  rows={3}
                  placeholder={t('companies.descriptionPlaceholder') ?? 'Descrição da empresa'}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateCompany}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {t('companies.create') ?? 'Criar Empresa'}
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
              {t('companies.inviteTo') ?? 'Convidar para'} {selectedCompany.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('companies.userEmail') ?? 'Email do Usuário'}</label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder={t('companies.userEmailPlaceholder') ?? 'usuario@exemplo.com'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('companies.role') ?? 'Função'}</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as 'admin' | 'member' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  title="Selecionar função"
                >
                  <option value="member">{t('companies.role.member') ?? 'Membro'}</option>
                  <option value="admin">{t('companies.role.admin') ?? 'Administrador'}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleInviteUser}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {t('companies.sendInvite') ?? 'Enviar Convite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Members Modal */}
      {showMembersModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {t('companies.membersOf') ?? 'Membros de'} {selectedCompany.name}
              </h3>
              <div className="flex items-center space-x-2">
                {currentUserRole === 'owner' && (
                  <button
                    onClick={() => setShowEditCompanyModal(true)}
                    className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                    title={t('companies.edit') ?? 'Editar empresa'}
                  >
                    <i className="ri-edit-2-line w-5 h-5"></i>
                  </button>
                )}
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title={t('common.close') ?? 'Fechar'}
                >
                  <i className="ri-close-line w-5 h-5"></i>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <i className="ri-search-line w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Buscar por nome ou email..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
                <select
                  value={memberRoleFilter}
                  onChange={(e) => setMemberRoleFilter(e.target.value as any)}
                  className="px-2 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                  title="Filtrar por role/status"
                >
                  <option value="all">Todos</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="pending">Pendentes</option>
                  <option value="accepted">Ativos</option>
                  <option value="declined">Recusados</option>
                </select>
                <select
                  value={memberSort}
                  onChange={(e) => setMemberSort(e.target.value as any)}
                  className="px-2 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                  title="Ordenar por"
                >
                  <option value="invited_at">Convidado em</option>
                  <option value="name">Nome</option>
                  <option value="role">Função</option>
                  <option value="status">Status</option>
                </select>
              </div>
              {companyMembers
                .filter((m) => {
                  if (memberRoleFilter === 'all') return true;
                  if (memberRoleFilter === 'pending' || memberRoleFilter === 'accepted' || memberRoleFilter === 'declined') {
                    return m.status === memberRoleFilter;
                  }
                  return m.role === memberRoleFilter;
                })
                .filter((m) => {
                  const q = memberSearch.trim().toLowerCase();
                  if (!q) return true;
                  const name = (m.user_full_name || '').toLowerCase();
                  const email = (m.user_email || '').toLowerCase();
                  const uid = (m.user_id || '').toLowerCase();
                  return name.includes(q) || email.includes(q) || uid.includes(q);
                })
                .sort((a, b) => {
                  if (memberSort === 'invited_at') return (new Date(a.invited_at).getTime() - new Date(b.invited_at).getTime());
                  if (memberSort === 'name') return (a.user_full_name || '').localeCompare(b.user_full_name || '');
                  if (memberSort === 'role') return a.role.localeCompare(b.role);
                  if (memberSort === 'status') return a.status.localeCompare(b.status);
                  return 0;
                })
                .map((member: CompanyMember) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-700 dark:text-gray-200">
                        {(member.user_full_name || member.user_email || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {member.user_id === currentUser?.id ? 'Você' : (member.user_full_name || `Usuário ${member.user_id.slice(0, 8)}`)}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{member.user_email || ''}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {member.status === 'pending' ? 'Pendente' : member.status === 'accepted' ? 'Ativo' : 'Recusado'}
                        </div>
                      </div>
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
                    {currentUserRole === 'owner' && member.role !== 'owner' && (
                      <button
                        onClick={() => handleTransferOwnership(member)}
                        className="p-2 text-amber-600 hover:text-amber-700"
                        title="Transferir propriedade"
                      >
                        <i className="ri-vip-crown-2-line w-4 h-4"></i>
                      </button>
                    )}
                    {member.status === 'pending' && canManageMembers && (
                      <>
                        <button
                          onClick={() => handleResendInvite(member)}
                          className="p-2 text-blue-600 hover:text-blue-700"
                          title="Reenviar convite"
                        >
                          <i className="ri-send-plane-2-line w-4 h-4"></i>
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(member)}
                          className="p-2 text-gray-600 hover:text-gray-700"
                          title="Revogar convite"
                        >
                          <i className="ri-close-circle-line w-4 h-4"></i>
                        </button>
                      </>
                    )}
                    {canManageMembers && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        disabled={memberOps[member.id] === 'remove'}
                        className="p-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                        title={t('companies.removeMember') ?? 'Remover membro'}
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
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Auditoria recente</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
                {auditLogs.map((log) => {
                  const actor = companyMembers.find(m => m.user_id === log.actor_user_id);
                  const target = companyMembers.find(m => m.user_id === log.target_user_id);
                  const actorName = actor?.user_full_name || actor?.user_email || (log.actor_user_id ? String(log.actor_user_id).slice(0,8) : '');
                  const targetName = target?.user_full_name || target?.user_email || (log.target_user_id ? String(log.target_user_id).slice(0,8) : '');
                  let text = log.action;
                  if (log.action === 'invite_sent') text = `Convite enviado para ${targetName}`;
                  if (log.action === 'role_updated') text = `Função de ${targetName} atualizada`;
                  if (log.action === 'ownership_transferred') text = `Propriedade transferida para ${targetName}`;
                  return (
                    <div key={log.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{text}</span>
                        <span className="text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-500 mt-1">Por: {actorName}</div>
                    </div>
                  );
                })}
                {auditLogs.length === 0 && (
                  <div className="p-2 text-gray-500">Sem eventos.</div>
                )}
              </div>
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