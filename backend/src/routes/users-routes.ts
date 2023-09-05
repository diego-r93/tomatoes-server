import { Express, Router } from 'express';
import * as users from '../database/sqlite/controllers/user.controllers';

const userRoutes = (app: Express) => {
    const router = Router();

    // router.get('/', users.findAll);

    router.post('/', users.createUser);

    router.post('/login', users.loginUser);

    // router.get("/:id", users.findOne);

    // router.put("/:id", verifyToken, users.update);

    app.use("/api/users", router);

};

export default userRoutes;
