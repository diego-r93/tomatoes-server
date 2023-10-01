import { Express, Router } from 'express';
import * as board from '../database/mongodb/controllers/board.controller';

const boardRoutes = (app: Express) => {
    const router = Router();

    // Create a new Board
    router.post("/", board.create);

    // Retrieve all Boards
    router.get("/", board.findAll);

    // Retrieve a single Board with id
    router.get("/:id", board.findOne);

    // Update a Board with id
    router.put("/:id", board.update);

    // Delete a Board with id
    router.delete("/:id", board.deleteOne);

    // Delete all Board
    router.delete("/", board.deleteAll);

    app.use("/boards", router);
};

export default boardRoutes;
