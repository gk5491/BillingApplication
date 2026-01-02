import { Router } from 'express';

export const vendorsRouter = Router();

vendorsRouter.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Vendors endpoint' });
});

vendorsRouter.get('/:id', (req, res) => {
  res.json({ success: true, data: { id: req.params.id }, message: 'Vendor detail endpoint' });
});

vendorsRouter.post('/', (req, res) => {
  res.json({ success: true, data: req.body, message: 'Vendor created' });
});

export default vendorsRouter;
