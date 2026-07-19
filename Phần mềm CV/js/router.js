const { createRouter, createWebHashHistory } = VueRouter;
import { isConfigured } from './supabaseClient.js';
import { state, can } from './state.js';
import { restoreSession } from './auth.js';

import Setup from './components/Setup.js';
import Login from './components/Login.js';
import AppShell from './components/AppShell.js';
import Dashboard from './components/Dashboard.js';
import Customers from './components/Customers.js';
import CustomerDetail from './components/CustomerDetail.js';
import Projects from './components/Projects.js';
import ProjectDetail from './components/ProjectDetail.js';
import QuotePrint from './components/QuotePrint.js';
import ContractPrint from './components/ContractPrint.js';
import Quotes from './components/Quotes.js';
import QuoteDetail from './components/QuoteDetail.js';
import ModulesCatalog from './components/ModulesCatalog.js';
import Technologies from './components/Technologies.js';
import Employees from './components/Employees.js';
import Commissions from './components/Commissions.js';
import Statistics from './components/Statistics.js';
import NotificationsPage from './components/NotificationsPage.js';
import AuditLogPage from './components/AuditLogPage.js';
import PermissionsPage from './components/PermissionsPage.js';
import SettingsPage from './components/SettingsPage.js';

const PATH_TO_MODULE = {
  '/dashboard': 'dashboard', '/customers': 'customers', '/projects': 'projects', '/quotes': 'quotes',
  '/modules-catalog': 'modules_catalog', '/technologies': 'technologies', '/employees': 'employees',
  '/commissions': 'commissions', '/statistics': 'statistics', '/notifications': 'notifications',
  '/audit-log': 'audit_log', '/permissions': 'permissions', '/settings': 'settings'
};

const routes = [
  { path: '/setup', component: Setup },
  { path: '/login', component: Login },
  {
    path: '/', component: AppShell, children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: Dashboard },
      { path: 'customers', component: Customers },
      { path: 'customers/:id', component: CustomerDetail },
      { path: 'projects', component: Projects },
      { path: 'projects/:id', component: ProjectDetail },
      { path: 'projects/:id/quote-print', component: QuotePrint },
      { path: 'projects/:id/contract-print', component: ContractPrint },
      { path: 'quotes', component: Quotes },
      { path: 'quotes/:id', component: QuoteDetail },
      { path: 'modules-catalog', component: ModulesCatalog },
      { path: 'technologies', component: Technologies },
      { path: 'employees', component: Employees },
      { path: 'commissions', component: Commissions },
      { path: 'statistics', component: Statistics },
      { path: 'notifications', component: NotificationsPage },
      { path: 'audit-log', component: AuditLogPage },
      { path: 'permissions', component: PermissionsPage },
      { path: 'settings', component: SettingsPage }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
];

export const router = createRouter({ history: createWebHashHistory(), routes });

let sessionChecked = false;

router.beforeEach(async (to) => {
  if (!isConfigured()) {
    return to.path === '/setup' ? true : '/setup';
  }
  if (to.path === '/setup') return true;

  if (!sessionChecked) {
    try { await restoreSession(); } catch (e) { /* ignore, treat as logged out */ }
    sessionChecked = true;
  }

  if (to.path === '/login') {
    return state.session ? '/dashboard' : true;
  }
  if (!state.session) return '/login';

  const firstSegment = '/' + to.path.split('/')[1];
  const moduleKey = PATH_TO_MODULE[firstSegment];
  if (moduleKey && !can(moduleKey, 'can_view')) return '/dashboard';

  return true;
});
