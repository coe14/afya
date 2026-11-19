/**
 * Barrel file: the single place to import models and their types from.
 *
 *   import { User, Booking, type IBooking } from '../models';
 *
 * Importing this file also registers every model with Mongoose, which
 * .populate() needs in order to resolve references like ref: 'Provider'.
 */

export * from "./shared.schemas";
export * from "./user.model";
export * from "./service.model";
export * from "./provider.model";
export * from "./booking.model";
export * from "./review.model";
