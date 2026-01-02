import { Router } from 'express';

export const customersRouter = Router();

customersRouter.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Customers endpoint' });
});

customersRouter.get('/:id', (req, res) => {
  res.json({ success: true, data: { id: req.params.id }, message: 'Customer detail endpoint' });
});

customersRouter.post('/', (req, res) => {
  res.json({ success: true, data: req.body, message: 'Customer created' });
});

export default customersRouter;
