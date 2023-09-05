import { Request, Response } from 'express';
import { User } from '../models/user.model';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

export const createUser = async (req: Request, res: Response) => {
  const user = new User(req.body);

  try {
    const userId = await user.save();
    res.status(201).send({ id: userId, ...user });
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).send({ message: err.message });
    } else {
      res.status(500).send({ message: 'An error occurred' });
    }
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.password!);
    if (!validPassword) {
      return res.status(401).send({ message: 'Invalid password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);
    res.status(200).send({
      ...user,
      accessToken: token
    });

  } catch (err) {
    if (err instanceof Error) {
      res.status(500).send({ message: err.message });
    }
  }
};
