import { JwtPayload } from 'jsonwebtoken';

export interface AuthPayload extends JwtPayload {
  id: string;
  email: string;
}

// Extends Express's Request so req.user is typed in all route handlers
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
