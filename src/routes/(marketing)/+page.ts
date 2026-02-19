import { redirect } from '@sveltejs/kit'
import '../../app.css'

export const ssr = true
export const prerender = true
export const csr = true

export const load = () => {
	redirect(301, '/library/shorts')
}
