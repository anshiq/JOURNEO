export const devLinkFor = (token: string) => `${window.location.origin}/d/${token}`
export const devLinkForCampaign = (c: any) => devLinkFor(c.devToken)
