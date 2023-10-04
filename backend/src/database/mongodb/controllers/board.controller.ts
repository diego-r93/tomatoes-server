import { Request, Response } from 'express';
import Board from '../models/board.model';

// Create and Save a new Board
export const create = async (req: Request, res: Response) => {
  const requiredProperties = ['pumperCode', 'pumperName', 'pulseDuration', 'driveTimes'];

  for (const prop of requiredProperties) {
    if (!req.body[prop]) {
      res.status(400).send({ message: `${prop} can not be empty!` });
      return;
    }
  }

  const board = new Board({
    pumperCode: req.body.pumperCode,
    pumperName: req.body.pumperName,
    pulseDuration: req.body.pulseDuration,
    driveTimes: req.body.driveTimes,
  });

  try {
    const data = await board.save();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Some error occurred while creating the Board." });
  }
}

// Retrieve all Boards from the database
export const findAll = async (req: Request, res: Response) => {
  try {
    const data = await Board.find();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Some error occurred while retrieving boards." });
  }
}

// Find a single Board with an id
export const findOne = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;

  try {
    const data = await Board.findOne({
      _id: id,
    });

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
export const update = async (req: Request, res: Response): Promise<void> => {
  if (!req.body) {
    res.status(400).send({ message: "Data to update can not be empty!" });
    return;
  }

  const id = req.params.id;

  try {
    const data = await Board.findOneAndUpdate({
      _id: id,
    }, req.body, { useFindAndModify: false, new: true });
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
export const editDriveTimeState = async (req: Request, res: Response): Promise<void> => {
  const { id, index, state } = req.body;

  try {
    const board = await Board.findById(id);
    if (board && index < board.driveTimes.length && index >= 0) {
      board.driveTimes[index].state = state;
      await board.save();
      res.send({ message: `Drive time state at index ${index} was updated successfully.` });
    } else {
      res.status(404).send({ message: "Invalid board or drive time index." });
    }
  } catch (error) {
    res.status(500).send({ message: "Error updating drive time state." });
  }
};

// Edit a time in the driveTimes array
export const editDriveTime = async (req: Request, res: Response): Promise<void> => {
  const { id, index, time } = req.body;

  try {
    const board = await Board.findById(id);
    if (board && index < board.driveTimes.length && index >= 0) {
      board.driveTimes[index].time = time;
      await board.save();
      res.send({ message: `Drive time at index ${index} was updated successfully.` });
    } else {
      res.status(404).send({ message: "Invalid board or drive time index." });
    }
  } catch (error) {
    res.status(500).send({ message: "Error updating drive time." });
  }
};

// Replace the entire driveTimes array
export const replaceDriveTimes = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  const newDriveTimes = req.body.driveTimes;

  try {
    const board = await Board.findById(id);
    if (board) {
      board.driveTimes = newDriveTimes;
      await board.save();
      res.send({ message: "Drive times were replaced successfully." });
    } else {
      res.status(404).send({ message: "Invalid board id." });
    }
  } catch (error) {
    res.status(500).send({ message: "Error replacing drive times." });
  }
};

// Delete an element at a specific index in the driveTimes array
export const deleteDriveTimeAtIndex = async (req: Request, res: Response): Promise<void> => {
  const { id, index } = req.body;

  try {
    const board = await Board.findById(id);
    if (board && index < board.driveTimes.length && index >= 0) {
      board.driveTimes.splice(index, 1);
      await board.save();
      res.send({ message: `Drive time at index ${index} was deleted successfully.` });
    } else {
      res.status(404).send({ message: "Invalid board or drive time index." });
    }
  } catch (error) {
    res.status(500).send({ message: "Error deleting drive time." });
  }
};

// Delete the entire driveTimes array
export const deleteAllDriveTimes = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;

  try {
    const board = await Board.findById(id);
    if (board) {
      board.driveTimes = [];
      await board.save();
      res.send({ message: "All drive times were deleted successfully." });
    } else {
      res.status(404).send({ message: "Invalid board id." });
    }
  } catch (error) {
    res.status(500).send({ message: "Error deleting all drive times." });
  }
};

// Delete a Board with the specified id in the request
export const deleteOne = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;

  try {
    const data = await Board.findOneAndRemove({
      _id: id,
    }, { useFindAndModify: false });

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
export const deleteAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await Board.deleteMany({});

    res.send({
      message: `${data.deletedCount} Boards were deleted successfully!`
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Some error occurred while removing all boards." });
  }
};

