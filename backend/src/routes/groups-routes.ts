import { Express, Router } from 'express';
import * as users from '../users/controller';
import { authenticate, endpoint, requireAdmin, userError } from '../users/http';

export default function setupGroups(app: Express) {
  const router = Router(); router.use(authenticate, requireAdmin);
  router.get('/', endpoint(users.groups));
  router.post('/', endpoint(users.saveGroup));
  router.put('/:id', endpoint(users.saveGroup));
  router.delete('/:id', endpoint(users.deleteGroup));
  app.use('/api/groups', router, userError);
}
