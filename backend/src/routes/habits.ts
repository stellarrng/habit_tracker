import { Router, Request, Response } from 'express';
import Habit from '../models/Habit';
import { protect } from '../middleware/auth';

const router = Router();

// All habits routes require authentication
router.use(protect);

// GET /api/habits — get all habits for the logged-in user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const habits = await Habit.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json(habits);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/habits — create a new habit
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, frequency, specificDays, targetPerDay, priority, goalTargetType, goalTargetValue, description } = req.body;

    if (!name || !category || !frequency || !targetPerDay) {
      res.status(400).json({ message: 'name, category, frequency and targetPerDay are required' });
      return;
    }

    const habit = await Habit.create({
      userId: req.user!.id,
      name,
      category,
      frequency,
      specificDays: specificDays ?? [],
      targetPerDay,
      priority: priority ?? 'Medium',
      goalTargetType: goalTargetType || undefined,
      goalTargetValue: goalTargetValue || undefined,
      description,
    });

    res.status(201).json(habit);
  } catch (error) {
    console.error('Error in POST /api/habits:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/habits/:id — update a habit
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user!.id });

    if (!habit) {
      res.status(404).json({ message: 'Habit not found' });
      return;
    }

    const { name, category, frequency, specificDays, targetPerDay, priority, status, goalTargetType, goalTargetValue, description } = req.body;

    if (name !== undefined)         habit.name         = name;
    if (category !== undefined)     habit.category     = category;
    if (frequency !== undefined)    habit.frequency    = frequency;
    if (specificDays !== undefined) habit.specificDays = specificDays;
    if (targetPerDay !== undefined) habit.targetPerDay = targetPerDay;
    if (priority !== undefined)     habit.priority     = priority;
    if (status !== undefined)       habit.status       = status;
    
    // Explicitly allow resetting goal to undefined/null or updating it
    if (goalTargetType !== undefined)  habit.goalTargetType  = goalTargetType || undefined;
    if (goalTargetValue !== undefined) habit.goalTargetValue = goalTargetValue || undefined;

    if (description !== undefined)  habit.description  = description;

    await habit.save();
    res.json(habit);
  } catch (error) {
    console.error('Error in PUT /api/habits:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/habits/:id — delete a habit
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });

    if (!habit) {
      res.status(404).json({ message: 'Habit not found' });
      return;
    }

    res.json({ message: 'Habit deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
