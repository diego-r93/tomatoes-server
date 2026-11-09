import { Request, Response } from 'express';
import type { BoardScheduleService } from '../../../boards/scheduleService';

export function createBoardController(service: BoardScheduleService) {
  // Create and Save a new Board
  const create = async (req: Request, res: Response) => {
    const requiredProperties = ['pumperCode', 'pumperName', 'pulseDuration', 'driveTimes'];

    for (const prop of requiredProperties) {
      if (!req.body[prop]) {
        res.status(400).send({ message: `${prop} can not be empty!` });
        return;
      }
    }

    const fields = {
      pumperCode: req.body.pumperCode,
      pumperName: req.body.pumperName,
      pulseDuration: req.body.pulseDuration,
      driveTimes: req.body.driveTimes,
    };

    try {
      const data = await service.create(fields);
      res.send(data);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Some error occurred while creating the Board." });
    }
  }

  // Retrieve all Boards from the database
  const findAll = async (req: Request, res: Response) => {
    try {
      const data = await service.findAll();
      res.send(data);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Some error occurred while retrieving boards." });
    }
  }

  // Find a single Board with an id
  const findOne = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    try {
      const data = await service.findOne(id);

      if (!data) {
        res.status(404).send({ message: `Not found Board with id ${id}` });
      } else {
        res.send(data);
      }
    } catch (errror) {
      res.status(500).send({ message: `Error retrieving Board with id=${id}` });
    }
  };

  // Update a Board by the id in the request
  const update = async (req: Request, res: Response): Promise<void> => {
    if (!req.body) {
      res.status(400).send({ message: "Data to update can not be empty!" });
      return;
    }

    const id = req.params.id as string;

    try {
      const data = await service.update(id, req.body);
      if (!data) {
        res.status(404).send({
          message: `Cannot update Board with id=${id}. Maybe Board was not found!`
        });
      } else res.send({ message: "Board was updated successfully." });
    } catch (error) {
      res.status(500).send({
        message: "Error updating Board with id=" + id
      });
    }
  };

  // Edit the state of an element in the driveTimes array
  const editDriveTimeState = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const index = parseInt(req.params.index as string, 10); // Convertendo o index para um número
    const { state } = req.body;

    try {
      if (await service.editDriveTimeState(id, index, state)) {
        res.send({ message: `Drive time state at index ${index} was updated successfully.` });
      } else {
        res.status(404).send({ message: "Invalid board or drive time index." });
      }
    } catch (error) {
      res.status(500).send({ message: "Error updating drive time state." });
    }
  };

  // Edit a time in the driveTimes array
  const editDriveTime = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const index = parseInt(req.params.index as string, 10); // Convertendo o index para um número
    const { time } = req.body;

    try {
      if (await service.editDriveTime(id, index, time)) {
        res.send({ message: `Drive time at index ${index} was updated successfully.` });
      } else {
        res.status(404).send({ message: "Invalid board or drive time index." });
      }
    } catch (error) {
      res.status(500).send({ message: "Error updating drive time." });
    }
  };


  // Replace the entire driveTimes array
  const replaceDriveTimes = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const newDriveTimes = req.body.driveTimes;

    try {
      if (await service.replaceDriveTimes(id, newDriveTimes)) {
        res.send({ message: "Drive times were replaced successfully." });
      } else {
        res.status(404).send({ message: "Invalid board id." });
      }
    } catch (error) {
      res.status(500).send({ message: "Error replacing drive times." });
    }
  };

  // Delete an element at a specific index in the driveTimes array
  const deleteDriveTimeAtIndex = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const index = parseInt(req.params.index as string, 10);

    try {
      if (await service.deleteDriveTimeAtIndex(id, index)) {
        res.send({ message: `Drive time at index ${index} was deleted successfully.` });
      } else {
        res.status(404).send({ message: "Invalid board or drive time index." });
      }
    } catch (error) {
      res.status(500).send({ message: "Error deleting drive time." });
    }
  };

  // Delete the entire driveTimes array
  const deleteAllDriveTimes = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    try {
      if (await service.deleteAllDriveTimes(id)) {
        res.send({ message: "All drive times were deleted successfully." });
      } else {
        res.status(404).send({ message: "Invalid board id." });
      }
    } catch (error) {
      res.status(500).send({ message: "Error deleting all drive times." });
    }
  };

  // Delete a Board with the specified id in the request
  const deleteOne = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    try {
      const data = await service.deleteOne(id);

      if (!data) {
        res.status(404).send({
          message: `Cannot delete Board with id=${id}. Maybe Board was not found!`
        });
      } else {
        res.send({
          message: "Board was deleted successfully!"
        });
      }
    } catch (error) {
      res.status(500).send({
        message: `Could not delete Board with id=${id}`
      });
    }
  };

  // Delete all Boards from the database.
  const deleteAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedCount = await service.deleteAll();

      res.send({
        message: `${deletedCount} Boards were deleted successfully!`
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Some error occurred while removing all boards." });
    }
  };

  return {
    create,
    findAll,
    findOne,
    update,
    editDriveTimeState,
    editDriveTime,
    replaceDriveTimes,
    deleteDriveTimeAtIndex,
    deleteAllDriveTimes,
    deleteOne,
    deleteAll,
  };
}
