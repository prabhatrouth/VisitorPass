import { Router, Request, Response } from 'express';
import { db } from './db.js';

export const apiRouter = Router();

// POST /api/auth/login - Reception desk staff login
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { deskId, username, password } = req.body;
    const inputId = (deskId || username || '').trim();
    const inputPassword = (password || '').trim();

    if (!inputId || !inputPassword) {
      return res.status(400).json({
        success: false,
        message: 'Desk ID and password are required',
      });
    }

    // Check database receptionists
    const foundDesk = await db.findReceptionDeskForAuth(inputId);
    if (foundDesk && foundDesk.password === inputPassword) {
      const token = Buffer.from(`${foundDesk.deskId}:${Date.now()}`).toString('base64');
      return res.json({
        success: true,
        message: 'Logged in successfully',
        data: {
          token,
          deskId: foundDesk.deskId,
          stationName: foundDesk.stationName,
          isPrimary: foundDesk.isPrimary,
        },
      });
    }

    // Fallback check against process.env
    const expectedId = (process.env.RECEPTION_ID || 'admin').trim();
    const expectedPassword = (process.env.RECEPTION_PASSWORD || 'admin123').trim();
    if (inputId.toLowerCase() === expectedId.toLowerCase() && inputPassword === expectedPassword) {
      const token = Buffer.from(`${inputId}:${Date.now()}`).toString('base64');
      return res.json({
        success: true,
        message: 'Logged in successfully',
        data: {
          token,
          deskId: inputId,
          stationName: 'Main Reception Desk',
          isPrimary: true,
        },
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid Desk ID or Password. Please try again.',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// GET /api/auth/verify - Verify session token
apiRouter.get('/auth/verify', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No active session' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [deskId] = decoded.split(':');
    const foundDesk = await db.findReceptionDeskForAuth(deskId);
    if (foundDesk) {
      return res.json({
        success: true,
        data: {
          token,
          deskId: foundDesk.deskId,
          stationName: foundDesk.stationName,
          isPrimary: foundDesk.isPrimary,
        },
      });
    }
  } catch {
    // invalid token format
  }

  return res.status(401).json({ success: false, message: 'Invalid or expired session' });
});

// GET /api/receptions - List all reception desks
apiRouter.get('/receptions', async (_req: Request, res: Response) => {
  try {
    const desks = await db.getReceptionDesks();
    res.json({ success: true, count: desks.length, data: desks });
  } catch (error: any) {
    console.error('Error fetching reception desks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reception desks' });
  }
});

// POST /api/receptions - Create new reception desk
apiRouter.post('/receptions', async (req: Request, res: Response) => {
  try {
    const { deskId, password, stationName } = req.body;
    if (!deskId || !deskId.trim()) {
      return res.status(400).json({ success: false, message: 'Desk ID is required' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    if (password.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
    }

    const newDesk = await db.createReceptionDesk({
      deskId: deskId.trim(),
      password: password.trim(),
      stationName: (stationName || '').trim(),
    });

    res.status(201).json({
      success: true,
      message: `Reception Desk "${newDesk.stationName}" created successfully`,
      data: newDesk,
    });
  } catch (error: any) {
    console.error('Error creating reception desk:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create reception desk' });
  }
});

// DELETE /api/receptions/:id - Delete reception desk
apiRouter.delete('/receptions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteReceptionDesk(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Reception desk not found' });
    }
    res.json({ success: true, message: 'Reception desk deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting reception desk:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to delete reception desk' });
  }
});

// GET /api/visitors - View all records (with optional search and status filter)
apiRouter.get('/visitors', async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    const visitors = await db.getAll(
      typeof search === 'string' ? search : undefined,
      typeof status === 'string' ? status : undefined
    );
    res.json({ success: true, count: visitors.length, data: visitors });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch visitor records' });
  }
});

// GET /api/visitors/stats - Dashboard showing total, inside, check-ins, check-outs
apiRouter.get('/visitors/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// GET /api/visitors/export - Export visitor list to CSV with check-in/out timestamps and duration
apiRouter.get('/visitors/export', async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    const visitors = await db.getAll(
      typeof search === 'string' ? search : undefined,
      typeof status === 'string' ? status : undefined
    );

    const headers = [
      'Name',
      'Mobile Number',
      'Company/College Name',
      'Person to Meet',
      'Purpose of Visit',
      'Status',
      'Check-in Time',
      'Check-out Time',
      'Duration (Minutes)',
    ];

    const escapeCsv = (str: string | null | undefined): string => {
      if (!str) return '""';
      const clean = str.replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${clean}"`;
    };

    const rows = visitors.map((v) => {
      const inTime = v.checkInTime || v.dateTime;
      const outTime = v.checkOutTime;
      let durationMinutes = '';
      if (inTime && outTime) {
        const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
        if (diffMs > 0) {
          durationMinutes = Math.round(diffMs / (1000 * 60)).toString();
        }
      }

      return [
        escapeCsv(v.name),
        escapeCsv(v.mobileNumber),
        escapeCsv(v.companyOrCollege),
        escapeCsv(v.personToMeet),
        escapeCsv(v.purposeOfVisit),
        escapeCsv(v.status === 'CHECKED_IN' ? 'Checked In (Inside)' : 'Checked Out'),
        escapeCsv(inTime ? new Date(inTime).toLocaleString() : ''),
        escapeCsv(outTime ? new Date(outTime).toLocaleString() : 'Still Inside'),
        escapeCsv(durationMinutes),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `visitors-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
});

// POST /api/visitors - Add and Check-In a new visitor
apiRouter.post('/visitors', async (req: Request, res: Response) => {
  try {
    const {
      name,
      mobileNumber,
      companyOrCollege,
      personToMeet,
      purposeOfVisit,
      dateTime,
      status,
      checkInTime,
      registeredByDesk,
    } = req.body;

    // Field Validations
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Visitor name is required' });
    }
    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    if (!companyOrCollege || !companyOrCollege.trim()) {
      return res.status(400).json({ success: false, message: 'Company or College name is required' });
    }
    if (!personToMeet || !personToMeet.trim()) {
      return res.status(400).json({ success: false, message: 'Person to meet is required' });
    }
    if (!purposeOfVisit || !purposeOfVisit.trim()) {
      return res.status(400).json({ success: false, message: 'Purpose of visit is required' });
    }

    const newVisitor = await db.create({
      name,
      mobileNumber,
      companyOrCollege,
      personToMeet,
      purposeOfVisit,
      dateTime,
      status: status || 'CHECKED_IN',
      checkInTime: checkInTime || dateTime || new Date().toISOString(),
      registeredByDesk: registeredByDesk || 'admin',
    });

    res.status(201).json({
      success: true,
      message: `Visitor "${newVisitor.name}" checked in successfully`,
      data: newVisitor,
    });
  } catch (error) {
    console.error('Error registering visitor:', error);
    res.status(500).json({ success: false, message: 'Failed to register visitor' });
  }
});

// POST /api/visitors/:id/checkout - Check-out a visitor
apiRouter.post('/visitors/:id/checkout', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deskId, checkOutTime } = req.body;

    const existing = await db.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    const updated = await db.checkOut(id, deskId, checkOutTime);
    res.json({
      success: true,
      message: `Visitor "${existing.name}" checked out successfully`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error checking out visitor:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to check out visitor' });
  }
});

// POST /api/visitors/:id/checkin - Check-in or Re-check-in a visitor
apiRouter.post('/visitors/:id/checkin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deskId, checkInTime } = req.body;

    const existing = await db.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    const updated = await db.checkIn(id, deskId, checkInTime);
    res.json({
      success: true,
      message: `Visitor "${existing.name}" checked in successfully`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error checking in visitor:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to check in visitor' });
  }
});

// PUT /api/visitors/:id - Edit visitor details
apiRouter.put('/visitors/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, mobileNumber, companyOrCollege, personToMeet, purposeOfVisit, dateTime } = req.body;

    const existing = await db.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    const updated = await db.update(id, {
      name,
      mobileNumber,
      companyOrCollege,
      personToMeet,
      purposeOfVisit,
      dateTime,
    });

    res.json({
      success: true,
      message: 'Visitor details updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating visitor:', error);
    res.status(500).json({ success: false, message: 'Failed to update visitor details' });
  }
});

// DELETE /api/visitors/:id - Delete visitor record
apiRouter.delete('/visitors/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }
    res.json({ success: true, message: 'Visitor record deleted successfully' });
  } catch (error) {
    console.error('Error deleting visitor:', error);
    res.status(500).json({ success: false, message: 'Failed to delete visitor' });
  }
});
