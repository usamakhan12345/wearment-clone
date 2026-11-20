import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Single entry point for the Payload Local API from server code (RSC, route handlers, actions).
 * `getPayload` caches the initialised instance, so calling this per request is cheap.
 */
export const getPayloadClient = () => getPayload({ config })
