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

    // Update a Board with id (replace)
    router.put("/:id", board.update);

    // Edit state of a specific driveTime in a Board
    router.patch("/:id/driveTimes/:index/state", board.editDriveTimeState);

    // Edit time of a specific driveTime in a Board
    router.patch("/:id/driveTimes/:index/time", board.editDriveTime);

    // Delete a specific driveTime in a Board
    router.delete("/:id/driveTimes/:index", board.deleteDriveTimeAtIndex);

    // Delete all driveTimes in a Board
    router.delete("/:id/driveTimes", board.deleteAllDriveTimes);

    // Replace all driveTimes in a Board
    router.put("/:id/driveTimes", board.replaceDriveTimes);

    // Delete a Board with id
    router.delete("/:id", board.deleteOne);

    // Delete all Boards
    router.delete("/", board.deleteAll);

    app.use("/boards", router);
};

export default boardRoutes;
