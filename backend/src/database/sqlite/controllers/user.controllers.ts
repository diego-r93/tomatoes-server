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

export const updatePassword = async (req: Request, res: Response) => {
  const { id, oldPassword, newPassword } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Verificar a senha antiga
    const validPassword = await bcrypt.compare(oldPassword, user.password!);
    if (!validPassword) {
      return res.status(401).send({ message: 'Invalid old password' });
    }

    // Criptografar a nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.update();

    res.status(200).send({ message: 'Password updated successfully' });
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).send({ message: err.message });
    }
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).send({ message: 'Invalid user ID' });
  }

  const { email, firstName, lastName, phone, state, fbId } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Atualizar campos do usuário
    user.email = email || user.email;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;
    user.state = state || user.state;
    user.fbId = fbId || user.fbId;

    await user.update();

    res.status(200).send({ message: 'User updated successfully' });
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).send({ message: err.message });
    }
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).send({ message: 'Invalid user ID' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    await user.delete();
    res.status(200).send({ message: 'User deleted successfully' });
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).send({ message: err.message });
    }
  }
};

export const findOne = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).send({ message: 'Invalid user ID' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).send(user);
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).send({ message: err.message });
    }
  }
};

export const findAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.findAll();
    res.status(200).send(users);
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).send({ message: err.message });
    }
  }
};