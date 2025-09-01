export const spring = (stiffness = 300, damping = 30, mass = 1) => {
	const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
	const angularFreq = Math.sqrt(stiffness / mass);
	const dampedFreq = angularFreq * Math.sqrt(1 - dampingRatio ** 2);

	return (t: number) => {
		if (dampingRatio < 1) {
			// Underdamped spring
			return (
				1 -
				Math.exp(-dampingRatio * angularFreq * t) *
					(Math.cos(dampedFreq * t) +
						(dampingRatio * angularFreq * Math.sin(dampedFreq * t)) /
							dampedFreq)
			);
		} else {
			// Critically damped or overdamped
			return 1 - Math.exp(-angularFreq * t);
		}
	};
};
