import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth';
import Habit from '../models/Habit';
import CheckIn from '../models/CheckIn';
import Goal from '../models/Goal';

const router = Router();
router.use(protect);

/**
 * DELETE /api/user/data
 * Deletes ALL habits, check-ins, and goals for the authenticated user.
 */
router.delete('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Delete all three collections in parallel for speed
    await Promise.all([
      Habit.deleteMany({ userId }),
      CheckIn.deleteMany({ userId }),
      Goal.deleteMany({ userId }),
    ]);

    res.json({ message: 'All data reset successfully.' });
  } catch {
    res.status(500).json({ message: 'Server error during reset.' });
  }
});

export default router;