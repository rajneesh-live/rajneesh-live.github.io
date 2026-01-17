import type { IconType } from '$lib/components/icon/Icon.svelte'
import * as m from '$paraglide/messages'

export interface NavItem {
    slug: string
    title: string
    icon: IconType
}

export const getNavItems = (): NavItem[] => {
    return [
        {
            slug: 'home',
            title: 'Home',
            icon: 'home',
        },
        {
            slug: 'explore',
            title: 'Explore',
            icon: 'compass',
        },
        {
            slug: 'playlists',
            title: m.playlists(),
            icon: 'playlist',
        },
    ]
}
