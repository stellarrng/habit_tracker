import { Router, Request, Response } from 'express';
import Goal from '../models/Goal';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

// GET /api/goals — get all goals for the logged-in user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const goals = await Goal.find({ userId: req.user!.id }).populate('habitId', 'name category');
    res.json(goals);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/goals/:habitId — get goal for a specific habit
router.get('/:habitId', async (req: Request, res: Response): Promise<void> => {
  try {
    const goal = await Goal.findOne({ habitId: req.params.habitId, userId: req.user!.id });
    if (!goal) {
      res.status(404).json({ message: 'Goal not found' });
      return;
    }
    res.json(goal);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/goals — create a goal (one per habit, enforced by unique index)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { habitId, targetType, targetValue } = req.body;

    if (!habitId || !targetType || !targetValue) {
      res.status(400).json({ message: 'habitId, targetType and targetValue are required' });
      return;
    }

    const goal = await Goal.create({ userId: req.user!.id, habitId, targetType, targetValue });
    res.status(201).json(goal);
  } catch (err: unknown) {
    const isDuplicate = typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000;
    if (isDuplicate) {
      res.status(409).json({ message: 'A goal already exists for this habit' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/goals/:id — update a goal
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!goal) {
      res.status(404).json({ message: 'Goal not found' });
      return;
    }

    const { targetType, targetValue } = req.body;
    if (targetType  !== undefined) goal.targetType  = targetType;
    if (targetValue !== undefined) goal.targetValue = targetValue;

    await goal.save();
    res.json(goal);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!goal) {
      res.status(404).json({ message: 'Goal not found' });
      return;
    }
    res.json({ message: 'Goal deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
