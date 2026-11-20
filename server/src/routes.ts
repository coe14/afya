import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { healthRouter } from "./modules/health/health.routes";
import { userRouter } from "./modules/users/user.routes";

/** All feature routers are mounted here and served under /api/v1. */
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);

// Future modules (added in later steps):
// apiRouter.use('/providers', providersRouter);
// apiRouter.use('/services', servicesRouter);
// apiRouter.use('/bookings', bookingsRouter);
// apiRouter.use('/reviews', reviewsRouter);
// apiRouter.use('/admin', adminRouter);
