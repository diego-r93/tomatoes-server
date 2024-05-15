import { Express, Router } from 'express';
import * as users from '../database/sqlite/controllers/user.controllers';

const userRoutes = (app: Express) => {
    const router = Router();

    router.post('/', users.createUser);

    router.post('/login', users.loginUser);

    // Rota para alterar a senha do usuário
    router.put('/update-password', users.updatePassword);

    // Rota para atualizar as informações do usuário
    router.put('/:id', users.updateUser);

    // Rota para buscar um usuário específico pelo ID
    router.get('/:id', users.findOne);

    // Rota para buscar todos os usuários
    router.get('/', users.findAllUsers);

    // Rota para deletar usuário
    router.delete('/:id', users.deleteUser);

    app.use("/api/users", router);
};

export default userRoutes;
