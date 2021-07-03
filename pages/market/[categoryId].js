import axios from 'axios'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Nav from '../../components/Nav'
import Head from 'next/head'
import Footer from '../../components/Footer'
import useStore from '../../store'
import CardList from '../../components/CardList'
import CardListLoader from '../../components/CardListLoader'
import { parseSortQuery } from '../../utils/common'
import { parseNearAmount } from 'near-api-js/lib/utils/format'
import CategoryList from '../../components/CategoryList'
import AddCategoryModal from '../../components/AddCategoryModal'

const LIMIT = 12

export default function Category() {
	const store = useStore()
	const router = useRouter()

	const [page, setPage] = useState(0)
	const [isFetching, setIsFetching] = useState(false)
	const [isFiltering, setIsFiltering] = useState(true)
	const [hasMore, setHasMore] = useState(true)
	const [showAddModal, setShowAddModal] = useState(false)

	const categoryDetail = store.cardCategory.filter(
		(category) => category.categoryId === router.query.categoryId
	)[0]

	useEffect(() => {
		getCategory()
		return () => {
			store.setMarketScrollPersist('market', 0)
		}
	}, [])

	useEffect(() => {
		if (router.query.categoryId) {
			_fetchData(true)
		}
	}, [router.query.categoryId])

	useEffect(() => {
		if (router.query.sort || router.query.pmin || router.query.pmax) {
			updateFilter(router.query)
		}
	}, [router.query.sort, router.query.pmin, router.query.pmax])

	const getCategory = async () => {
		const res = await axios(`${process.env.API_URL}/categories`)
		store.setCardCategory(res.data.data.results)
	}

	const updateFilter = async (query) => {
		setIsFiltering(true)
		const res = await axios(`${process.env.API_URL}/tokens`, {
			params: tokensParams(0, query),
		})
		_fetchData(true)
		setIsFiltering(false)
	}

	const _fetchData = async (initial = false) => {
		const _hasMore = initial ? true : hasMore
		const _tokens = initial ? [] : categoryDetail.list
		const _page = initial ? 0 : page

		if (!_hasMore || isFetching) {
			return
		}

		setIsFetching(true)
		const res = await axios(`${process.env.API_URL}/tokens`, {
			params: tokensParams(_page, router.query),
		})
		const newData = await res.data.data
		const newTokens = [..._tokens, ...newData.results]
		const newCategoryData = store.categoryCardList
		newCategoryData[router.query.categoryId] = newTokens

		store.setCategoryCardList(newCategoryData)
		setPage(_page + 1)
		if (newData.results.length < LIMIT) {
			setHasMore(false)
		} else {
			setHasMore(true)
		}
		setIsFetching(false)
	}

	const manageSubmission = () => {
		router.push(`/category-submission/${router.query.categoryId}`)
	}

	return (
		<div className="min-h-screen bg-black">
			<div
				className="fixed inset-0 opacity-50"
				style={{
					zIndex: 0,
					backgroundImage: `url('../bg.jpg')`,
					backgroundRepeat: 'no-repeat',
					backgroundSize: 'cover',
				}}
			></div>
			<Head>
				<title>Category — Paras</title>
				<meta
					name="description"
					content="Create, Trade and Collect. All-in-one social digital art cards marketplace for creators and collectors."
				/>

				<meta name="twitter:title" content="Market — Paras" />
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:site" content="@ParasHQ" />
				<meta name="twitter:url" content="https://paras.id" />
				<meta
					name="twitter:description"
					content="Create, Trade and Collect. All-in-one social digital art cards marketplace for creators and collectors."
				/>
				<meta
					name="twitter:image"
					content="https://paras-media.s3-ap-southeast-1.amazonaws.com/paras-v2-twitter-card-large.png"
				/>
				<meta property="og:type" content="website" />
				<meta property="og:title" content="Market — Paras" />
				<meta property="og:site_name" content="Market — Paras" />
				<meta
					property="og:description"
					content="Create, Trade and Collect. All-in-one social digital art cards marketplace for creators and collectors."
				/>
				<meta property="og:url" content="https://paras.id" />
				<meta
					property="og:image"
					content="https://paras-media.s3-ap-southeast-1.amazonaws.com/paras-v2-twitter-card-large.png"
				/>
			</Head>
			<Nav />
			{showAddModal && (
				<AddCategoryModal
					onClose={() => setShowAddModal(false)}
					categoryName={categoryDetail.name}
					categoryId={router.query.categoryId}
				/>
			)}
			<div className="max-w-6xl relative m-auto py-12">
				<div className="flex justify-center mb-4">
					<h1 className="text-4xl font-bold text-gray-100 text-center">
						Market
					</h1>
				</div>
				<CategoryList
					categoryId={categoryDetail?.categoryId || ''}
					listCategory={store.cardCategory}
				/>
				<div className="md:flex justify-between mt-8 px-4">
					{categoryDetail && (
						<>
							<div className="mb-8 md:mb-0">
								<h1 className="text-gray-100 font-bold text-4xl mb-4">
									{categoryDetail.name}
								</h1>
								<p className="text-gray-200 max-w-lg">
									{categoryDetail.description}
								</p>
							</div>
							<div className="text-gray-100 md:w-1/3 my-4">
								<div className="flex justify-between mb-4">
									<div>Status</div>
									<div>Open</div>
								</div>
								<div className="flex justify-between mb-6">
									<div>Curators</div>
									<div>{categoryDetail.curators.join(', ')}</div>
								</div>
								<div className="flex">
									<button
										className="w-full outline-none rounded-md bg-transparent text-sm font-semibold border-2 px-4 py-2 border-primary bg-primary text-gray-100"
										onClick={() => setShowAddModal(true)}
										type="button"
									>
										{`Submit to ${categoryDetail.name}`}
									</button>
									<button
										className="ml-4 w-full outline-none rounded-md bg-transparent text-sm font-semibold border-2 px-4 py-2 border-white text-white"
										onClick={manageSubmission}
										type="button"
									>
										{`Manage Submission`}
									</button>
								</div>
							</div>
						</>
					)}
				</div>
				<div className="mt-8 px-4">
					{hasMore ? (
						<div className="min-h-full border-2 border-dashed border-gray-800 rounded-md">
							<CardListLoader />
						</div>
					) : (
						<CardList
							name="market"
							tokens={store.categoryCardList[router.query.categoryId] || []}
							fetchData={_fetchData}
							hasMore={hasMore}
						/>
					)}
				</div>
			</div>
			<Footer />
		</div>
	)
}

const tokensParams = (_page = 0, query) => {
	const params = {
		categoryId: query.categoryId,
		excludeTotalBurn: true,
		__sort: parseSortQuery(query.sort),
		__skip: _page * LIMIT,
		__limit: LIMIT,
		...(query.pmin && { minPrice: parseNearAmount(query.pmin) }),
		...(query.pmax && { maxPrice: parseNearAmount(query.pmax) }),
	}
	return params
}
