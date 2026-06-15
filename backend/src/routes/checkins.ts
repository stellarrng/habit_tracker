import { Router, Request, Response } from 'express';
import CheckIn from '../models/CheckIn';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

// GET /api/checkins?habitId=&date= — query by habitId and/or date
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = { userId: req.user!.id };
    if (req.query.habitId) filter.habitId = req.query.habitId;
    if (req.query.date)    filter.date    = req.query.date;

    const checkIns = await CheckIn.find(filter).sort({ date: -1 });
    res.json(checkIns);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/checkins — create or update a check-in for a habit/date (upsert)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { habitId, date, completedCount, note } = req.body;

    if (!habitId || !date || completedCount === undefined) {
      res.status(400).json({ message: 'habitId, date and completedCount are required' });
      return;
    }

    let status: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
    if (completedCount > 0) status = 'In Progress';

    // fetch targetPerDay from the habit to determine Completed
    const { default: Habit } = await import('../models/Habit');
    const habit = await Habit.findOne({ _id: habitId, userId: req.user!.id });
    if (!habit) {
      res.status(404).json({ message: 'Habit not found' });
      return;
    }
    if (completedCount >= habit.targetPerDay) status = 'Completed';

    const checkIn = await CheckIn.findOneAndUpdate(
      { habitId, date, userId: req.user!.id },
      { completedCount, status, note: note ?? '' },
      { upsert: true, new: true }
    );

    res.status(201).json(checkIn);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/checkins/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const checkIn = await CheckIn.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!checkIn) {
      res.status(404).json({ message: 'Check-in not found' });
      return;
    }
    res.json({ message: 'Check-in deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
