import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  users as initialUsers,
  userProfiles as initialProfiles,
  userCompensations as initialCompensations,
  userSalaryComponents as initialSalaryComponents,
  authTokens as initialAuthTokens,
  auditLogs as initialAuditLogs,
} from '../data/mockData';
import type {
  User, UserProfile, UserCompensation, UserSalaryComponent,
  AuthToken, AuditLog, EmploymentStatus, AccountStatus,
} from '../data/mockData';

interface EmployeeContextType {
  // Data
  allUsers: User[];
  allProfiles: UserProfile[];
  allCompensations: UserCompensation[];
  allSalaryComponents: UserSalaryComponent[];
  allAuthTokens: AuthToken[];
  allAuditLogs: AuditLog[];
  // User CRUD
  addUser: (user: User) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  // Profile CRUD
  upsertProfile: (userId: string, data: Partial<UserProfile>) => void;
  // Compensation
  addCompensation: (comp: UserCompensation) => void;
  // Salary Components
  addSalaryComponent: (sc: UserSalaryComponent) => void;
  updateSalaryComponent: (id: string, data: Partial<UserSalaryComponent>) => void;
  // Auth Tokens
  addAuthToken: (token: AuthToken) => void;
  // Audit Logs
  addAuditLog: (log: AuditLog) => void;
}

const EmployeeContext = createContext<EmployeeContextType | null>(null);

export const useEmployeeData = () => {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error('useEmployeeData must be inside EmployeeProvider');
  return ctx;
};

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [allUsers, setAllUsers] = useState<User[]>(initialUsers);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(initialProfiles);
  const [allCompensations, setAllCompensations] = useState<UserCompensation[]>(initialCompensations);
  const [allSalaryComponents, setAllSalaryComponents] = useState<UserSalaryComponent[]>(initialSalaryComponents);
  const [allAuthTokens, setAllAuthTokens] = useState<AuthToken[]>(initialAuthTokens);
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  const addUser = useCallback((user: User) => setAllUsers(prev => [...prev, user]), []);
  const updateUser = useCallback((id: string, data: Partial<User>) => {
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
  }, []);

  const upsertProfile = useCallback((userId: string, data: Partial<UserProfile>) => {
    setAllProfiles(prev => {
      const idx = prev.findIndex(p => p.userId === userId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...data };
        return updated;
      }
      return [...prev, { userId, dependantCount: 0, ...data } as UserProfile];
    });
  }, []);

  const addCompensation = useCallback((comp: UserCompensation) => setAllCompensations(prev => [...prev, comp]), []);

  const addSalaryComponent = useCallback((sc: UserSalaryComponent) => setAllSalaryComponents(prev => [...prev, sc]), []);
  const updateSalaryComponent = useCallback((id: string, data: Partial<UserSalaryComponent>) => {
    setAllSalaryComponents(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const addAuthToken = useCallback((token: AuthToken) => setAllAuthTokens(prev => [...prev, token]), []);
  const addAuditLog = useCallback((log: AuditLog) => setAllAuditLogs(prev => [log, ...prev]), []);

  return (
    <EmployeeContext.Provider value={{
      allUsers, allProfiles, allCompensations, allSalaryComponents, allAuthTokens, allAuditLogs,
      addUser, updateUser, upsertProfile, addCompensation,
      addSalaryComponent, updateSalaryComponent, addAuthToken, addAuditLog,
    }}>
      {children}
    </EmployeeContext.Provider>
  );
}
