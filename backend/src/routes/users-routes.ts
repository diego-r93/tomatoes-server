import { Express, Router } from 'express';
import * as users from '../users/controller';
import { authenticate, endpoint, rateLimit, requireAdmin, userError } from '../users/http';

export default function setupUsers(app: Express) {
  const router = Router();
  router.post('/login', rateLimit(30), endpoint(users.loginUser));
  router.post('/request-password-reset', rateLimit(5), endpoint(users.requestPasswordReset));
  router.post('/password-reset/:token', rateLimit(10), endpoint(users.resetPassword));
  router.post('/', endpoint(users.createUser));
  router.use(authenticate);
  router.get('/me', endpoint(users.me));
  router.post('/refresh', endpoint(users.refresh));
  router.post('/logout', endpoint(users.logout));
  router.put('/update-password', endpoint(users.updatePassword));
  router.get('/settings', requireAdmin, endpoint(users.settings));
  router.get('/', requireAdmin, endpoint(users.findAllUsers));
  router.get('/:id/sessions', endpoint(users.sessions));
  router.delete('/:id/sessions', endpoint(users.revokeSessions));
  router.delete('/:id/sessions/:sessionId', endpoint(users.revokeSessions));
  router.get('/:id/activity', endpoint(users.recentActivity));
  router.put('/:id/membership', requireAdmin, endpoint(users.membership));
  router.patch('/:id/status', requireAdmin, endpoint(users.setEnabled));
  router.post('/:id/password-reset', requireAdmin, endpoint(users.adminPasswordReset));
  router.get('/:id', endpoint(users.findOne));
  router.put('/:id', endpoint(users.updateUser));
  router.delete('/:id', requireAdmin, endpoint(users.deleteUser));
  app.use('/api/users', router, userError);
}
