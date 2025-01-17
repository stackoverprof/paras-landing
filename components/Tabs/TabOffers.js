import cachios from 'cachios'
import LinkToProfile from 'components/Common/LinkToProfile'
import { formatNearAmount } from 'near-api-js/lib/utils/format'
import { useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useIntl } from 'hooks/useIntl'
import useStore from 'lib/store'
import Button from 'components/Common/Button'
import { sentryCaptureException } from 'lib/sentry'
import {
	GAS_FEE,
	GAS_FEE_150,
	GAS_FEE_200,
	STORAGE_APPROVE_FEE,
	STORAGE_MINT_FEE,
} from 'config/constants'
import JSBI from 'jsbi'
import { parseImgUrl, prettyBalance, timeAgo } from 'utils/common'
import Avatar from 'components/Common/Avatar'
import AcceptBidModal from 'components/Modal/AcceptBidModal'
import WalletHelper from 'lib/WalletHelper'
import { useToast } from 'hooks/useToast'

const FETCH_TOKENS_LIMIT = 12

const Offer = ({ data, onAcceptOffer, hideButton, fetchOffer }) => {
	const [profile, setProfile] = useState({})
	const currentUser = useStore((state) => state.currentUser)
	const toast = useToast()
	const { nearUsdPrice } = useStore()

	useEffect(() => {
		if (data.buyer_id) {
			fetchBuyerProfile()
		}
	}, [data.buyer_id])

	const fetchBuyerProfile = async () => {
		try {
			const resp = await cachios.get(`${process.env.V2_API_URL}/profiles`, {
				params: {
					accountId: data.buyer_id,
				},
				ttl: 60,
			})
			const newData = resp.data.data.results[0] || {}
			setProfile(newData)
		} catch (err) {
			sentryCaptureException(err)
		}
	}

	const deleteOffer = async () => {
		const params = {
			nft_contract_id: data.contract_id,
			...(data.token_id ? { token_id: data.token_id } : { token_series_id: data.token_series_id }),
		}

		try {
			const res = await WalletHelper.callFunction({
				contractId: process.env.MARKETPLACE_CONTRACT_ID,
				methodName: `delete_offer`,
				args: params,
				gas: GAS_FEE,
				deposit: '1',
			})

			if (res.response.error) {
				toast.show({
					text: (
						<div className="font-semibold text-center text-sm">
							{res.response.error.kind.ExecutionError}
						</div>
					),
					type: 'error',
					duration: 2500,
				})
			} else {
				toast.show({
					text: (
						<div className="font-semibold text-center text-sm">{`Successfully delete offer`}</div>
					),
					type: 'success',
					duration: 2500,
				})
				setTimeout(fetchOffer, 2500)
			}
		} catch (error) {
			sentryCaptureException(error)
		}
	}

	return (
		<div className="bg-gray-800 mt-3 p-3 rounded-md shadow-md">
			<div className="flex items-center">
				<div className="w-2/3 flex items-center">
					<div className="hidden md:block">
						<Avatar size="md" src={parseImgUrl(profile.imgUrl)} />
					</div>
					<div className="pl-2">
						<div className="overflow-hidden truncate">
							<LinkToProfile accountId={data.buyer_id} />
						</div>
					</div>
				</div>

				<div className="w-1/3 text-right">
					<p className="text-sm text-gray-300">{timeAgo.format(new Date(data.issued_at))}</p>
				</div>
			</div>
			<div className="flex items-center justify-between mt-2">
				<div className="flex items-baseline">
					<p>Offer {formatNearAmount(data.price)} Ⓝ</p>
					{nearUsdPrice !== 0 && (
						<p className="text-xs text-gray-300 truncate ml-1">
							~ ${prettyBalance(JSBI.BigInt(data.price) * nearUsdPrice, 24, 2)}
						</p>
					)}
				</div>
				{!hideButton && data.buyer_id !== currentUser && (
					<div>
						<Button
							size="sm"
							className="w-full"
							onClick={() => onAcceptOffer(data)}
							hideButton={hideButton}
						>
							Accept
						</Button>
					</div>
				)}
				{data.buyer_id === currentUser && (
					<div>
						<Button size="sm" className="w-full" onClick={deleteOffer} hideButton={hideButton}>
							Delete
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}

const TabOffers = ({ localToken }) => {
	const store = useStore()
	const [offers, setOffers] = useState([])
	const [page, setPage] = useState(0)
	const [hasMore, setHasMore] = useState(true)
	const [isFetching, setIsFetching] = useState(false)
	const [isOwned, setIsOwned] = useState(false)
	const [showModal, setShowModal] = useState(null)
	const [activeOffer, setActiveOffer] = useState(null)
	const [storageFee, setStorageFee] = useState(STORAGE_APPROVE_FEE)
	const [isAcceptingOffer, setIsAcceptingOffer] = useState(false)
	const toast = useToast()
	const { localeLn } = useIntl()

	useEffect(() => {
		if (localToken.token_series_id) {
			fetchOffers()
		}
	}, [localToken])

	useEffect(() => {
		if (offers.length > 0 && store.userProfile.accountId) {
			fetchOwnership()
		}
	}, [offers, store.userProfile])

	const onAcceptOffer = (offer) => {
		setActiveOffer(offer)
		setShowModal('acceptOffer')
	}

	const onDismissModal = () => {
		setShowModal(null)
	}

	const acceptOffer = async () => {
		try {
			const params = {
				account_id: process.env.MARKETPLACE_CONTRACT_ID,
			}
			setIsAcceptingOffer(true)
			const [userType, offerType, tokenId] = isOwned.split('::')

			if (offerType === 'token') {
				params.token_id = tokenId
				params.msg = JSON.stringify({
					market_type: 'accept_offer',
					buyer_id: activeOffer.buyer_id,
					price: activeOffer.price,
				})
			} else {
				params.token_series_id = activeOffer.token_series_id
				params.msg = JSON.stringify({
					market_type: 'accept_offer_paras_series',
					buyer_id: activeOffer.buyer_id,
					price: activeOffer.price,
				})
				if (tokenId) {
					params.token_id = tokenId
				}
			}

			let res
			// accept offer
			if (userType === 'owner') {
				res = await WalletHelper.callFunction({
					contractId: activeOffer.contract_id,
					methodName: `nft_approve`,
					args: params,
					gas: GAS_FEE_150,
					deposit: STORAGE_APPROVE_FEE,
				})
			}
			// batch tx -> mint & accept
			else {
				res = await WalletHelper.callFunction({
					contractId: activeOffer.contract_id,
					methodName: `nft_mint_and_approve`,
					args: params,
					gas: GAS_FEE_200,
					deposit: JSBI.add(
						JSBI.BigInt(STORAGE_APPROVE_FEE),
						JSBI.BigInt(STORAGE_MINT_FEE)
					).toString(),
				})
			}

			if (res.response.error) {
				toast.show({
					text: (
						<div className="font-semibold text-center text-sm">
							{res.response.error.kind.ExecutionError}
						</div>
					),
					type: 'error',
					duration: 2500,
				})
			} else {
				onDismissModal()
				toast.show({
					text: (
						<div className="font-semibold text-center text-sm">{`Successfully accept offer`}</div>
					),
					type: 'success',
					duration: 2500,
				})
				setTimeout(() => fetchOffers(true), 2500)
			}

			setIsAcceptingOffer(false)
		} catch (err) {
			sentryCaptureException(err)
		}
	}

	const fetchOwnership = async () => {
		// check ownership by token
		if (localToken.token_id) {
			const ownershipResp = await cachios.get(`${process.env.V2_API_URL}/token`, {
				params: {
					token_id: localToken.token_id,
					contract_id: localToken.contract_id,
					owner_id: store.userProfile.accountId,
					__limit: 1,
				},
				ttl: 30,
			})
			if (ownershipResp.data.data.results[0]) {
				setIsOwned(`owner::token::${localToken.token_id}`)
				setStorageFee(STORAGE_APPROVE_FEE)
			}
		}
		// check ownership by series
		else {
			const ownershipResp = await cachios.get(`${process.env.V2_API_URL}/token`, {
				params: {
					token_series_id: localToken.token_series_id,
					contract_id: localToken.contract_id,
					owner_id: store.userProfile.accountId,
					__limit: 1,
				},
				ttl: 30,
			})

			const creatorId = localToken.metadata.creator_id || localToken.contract_id

			if (ownershipResp.data.data.results[0]) {
				setIsOwned(`owner::series::${ownershipResp.data.data.results[0].token_id}`)
				setStorageFee(STORAGE_APPROVE_FEE)
			} else if (store.userProfile.accountId === creatorId) {
				setIsOwned('creator::series')
				setStorageFee(
					JSBI.add(JSBI.BigInt(STORAGE_APPROVE_FEE), JSBI.BigInt(STORAGE_MINT_FEE)).toString()
				)
			}
		}
	}

	const fetchOffers = async (fromStart = false) => {
		const _hasMore = fromStart ? true : hasMore
		const _page = fromStart ? 0 : page
		const _offers = fromStart ? [] : offers

		if (!_hasMore || isFetching) {
			return
		}

		setIsFetching(true)

		const params = {
			__skip: _page * FETCH_TOKENS_LIMIT,
			__limit: FETCH_TOKENS_LIMIT,
		}

		if (localToken.token_id) {
			params.token_id = localToken.token_id
			params.contract_id = localToken.contract_id
		} else {
			params.token_series_id = localToken.token_series_id
			params.contract_id = localToken.contract_id
		}

		const resp = await cachios.get(`${process.env.V2_API_URL}/offers`, {
			params: params,
			ttl: 30,
			force: fromStart,
		})

		const newData = resp.data.data

		const newOffers = [...(_offers || []), ...newData.results]
		const hasMoretoFetch = newData.results.length < FETCH_TOKENS_LIMIT ? false : true

		setOffers(newOffers)
		setPage(_page + 1)
		setHasMore(hasMoretoFetch)

		setIsFetching(false)
	}

	return (
		<div className="text-white">
			<InfiniteScroll
				dataLength={offers.length}
				next={fetchOffers}
				hasMore={hasMore}
				scrollableTarget="TokenScroll"
				loader={
					<div className="bg-gray-800 mt-3 p-3 rounded-md shadow-md">
						<div className="text-white text-center">{localeLn('Loading...')}</div>
					</div>
				}
			>
				{offers.length !== 0 ? (
					offers.map((x) => (
						<div key={x._id}>
							<Offer
								data={x}
								onAcceptOffer={() => onAcceptOffer(x)}
								hideButton={!isOwned}
								fetchOffer={() => fetchOffers(true)}
							/>
						</div>
					))
				) : (
					<div className="bg-gray-800 mt-3 p-3 rounded-md shadow-md">
						<div className="text-white text-center">{'No offer at the moment'}</div>
					</div>
				)}
			</InfiniteScroll>
			{showModal === 'acceptOffer' && (
				<AcceptBidModal
					show={showModal === 'buy'}
					onClose={onDismissModal}
					token={localToken}
					data={activeOffer}
					storageFee={storageFee}
					onSubmitForm={acceptOffer}
					isLoading={isAcceptingOffer}
				/>
			)}
		</div>
	)
}

export default TabOffers
