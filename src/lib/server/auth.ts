import jwt from 'jsonwebtoken';
import { db } from '.';
import { JWT_SECRET } from '$env/static/private';

export const masterPasswordSet = () =>
	db.config.findOne({ key: 'masterPassword' });

export const verify = (token?: string) =>
	token && jwt.verify(token, JWT_SECRET);
