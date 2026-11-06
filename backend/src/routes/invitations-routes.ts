import { Express, Router } from 'express';
import * as users from '../users/controller';
import { authenticate, endpoint, rateLimit, requireAdmin, userError } from '../users/http';

export default function setupInvitations(app: Express) {
  const router = Router();
  router.get('/:token', rateLimit(60), endpoint(users.invitationInfo));
  router.post('/:token/accept', rateLimit(20), endpoint(users.acceptInvitation));
  router.use(authenticate, requireAdmin);
  router.get('/', endpoint(users.invitations));
  router.post('/', rateLimit(30, 3600000), endpoint(users.sendInvite));
  router.post('/:id/resend', rateLimit(30, 3600000), endpoint(users.sendInvite));
  router.delete('/:id', endpoint(users.revokeInvite));
  app.use('/api/invitations', router, userError);
}
