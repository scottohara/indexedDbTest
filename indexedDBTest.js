$(function() {
	var	NUM_PROGRAMS = 100,
			NUM_SERIES = 6,
			NUM_EPISODES = 11,
			NOW_SHOWING = [8,4,6,2,5,3,7,1,5,2,6,1],
			initWebSqlDb = false,
			webSqlTest,
			initIndexedDb = false,
			iDbTest;

	// WebSQL
	webSqlTest = new WebSQLTest(initWebSqlDb, NUM_PROGRAMS, NUM_SERIES, NUM_EPISODES, NOW_SHOWING);

	// IndexedDB
	iDbTest = new IDBTest(initIndexedDb, NUM_PROGRAMS, NUM_SERIES, NUM_EPISODES, NOW_SHOWING);

	$("#go").click(function() {
		// Count Programs
		webSqlTest.countPrograms();
		iDbTest.countPrograms();
		
		// Count Series
		webSqlTest.countSeries();
		iDbTest.countSeries();
		
		// Count Episodes
		webSqlTest.countEpisodes();
		iDbTest.countEpisodes();

		// Schedule
		webSqlTest.schedule();
		iDbTest.schedule();
	});
});
