import { Router } from 'express';

export const expensesRouter = Router();

expensesRouter.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Expenses endpoint' });
});

expensesRouter.get('/:id', (req, res) => {
  res.json({ success: true, data: { id: req.params.id }, message: 'Expense detail endpoint' });
});

expensesRouter.post('/', (req, res) => {
  res.json({ success: true, data: req.body, message: 'Expense created' });
});

export default expensesRouter;
