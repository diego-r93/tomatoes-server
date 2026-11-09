import { queueScheduleSync } from '../mqtt/schedules';
import { authenticate, requireAdmin } from '../users/http';
import { Express, Router } from 'express';
import { createBoardController } from '../database/mongodb/controllers/board.controller';
import { createBoardScheduleService } from '../boards/scheduleService';
import { boardRepository } from '../database/mongodb/repositories/board.repository';

const board = createBoardController(createBoardScheduleService(boardRepository, queueScheduleSync));

const boardRoutes = (app: Express) => {
    const router = Router();
    // Create a new Board
    router.post("/", authenticate, requireAdmin, board.create);

    // Retrieve all Boards
    router.get("/", authenticate, board.findAll);

    // Retrieve a single Board with id
    router.get("/:id", authenticate, board.findOne);

    // Update a Board with id (replace)
    router.put("/:id", authenticate, requireAdmin, board.update);

    // Edit state of a specific driveTime in a Board
    router.patch("/:id/driveTimes/:index/state", authenticate, requireAdmin, board.editDriveTimeState);

    // Edit time of a specific driveTime in a Board
    router.patch("/:id/driveTimes/:index/time", authenticate, requireAdmin, board.editDriveTime);

    // Delete a specific driveTime in a Board
    router.delete("/:id/driveTimes/:index", authenticate, requireAdmin, board.deleteDriveTimeAtIndex);

    // Delete all driveTimes in a Board
    router.delete("/:id/driveTimes", authenticate, requireAdmin, board.deleteAllDriveTimes);

    // Replace all driveTimes in a Board
    router.put("/:id/driveTimes", authenticate, requireAdmin, board.replaceDriveTimes);

    // Delete a Board with id
    router.delete("/:id", authenticate, requireAdmin, board.deleteOne);

    // Delete all Boards
    router.delete("/", authenticate, requireAdmin, board.deleteAll);

    app.use("/boards", router);
};

export default boardRoutes;
