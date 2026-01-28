/**
 * Geometry Battle Arena - Math Utilities
 * 핵심 기하학 계산 및 판정 로직 (사각형 추가)
 */

const MathUtils = {
    getDistance: (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)),

    getAngle: (p1, center, p2) => {
        const d1 = MathUtils.getDistance(center, p1);
        const d2 = MathUtils.getDistance(center, p2);
        const d3 = MathUtils.getDistance(p1, p2); 
        if (d1 === 0 || d2 === 0) return 0;
        const cosTheta = (d1 * d1 + d2 * d2 - d3 * d3) / (2 * d1 * d2);
        return Math.acos(Math.min(1, Math.max(-1, cosTheta))) * (180 / Math.PI);
    },

    getTriangleSides: (points) => {
        if (points.length !== 3) return null;
        const a = MathUtils.getDistance(points[1], points[2]);
        const b = MathUtils.getDistance(points[0], points[2]);
        const c = MathUtils.getDistance(points[0], points[1]);
        return [a, b, c].sort((x, y) => x - y);
    },

    getQuadSides: (points) => {
        if (points.length !== 4) return null;
        // 순서대로 연결된 사각형 가정 (p0-p1-p2-p3)
        return [
            MathUtils.getDistance(points[0], points[1]),
            MathUtils.getDistance(points[1], points[2]),
            MathUtils.getDistance(points[2], points[3]),
            MathUtils.getDistance(points[3], points[0])
        ];
    },

    // --- 판정 로직 ---

    // 1. 직각삼각형 (기존)
    checkRightTriangle: (points) => {
        const sides = MathUtils.getTriangleSides(points);
        if (!sides) return { valid: false, accuracy: 0 };
        const [a, b, c] = sides; // c is hypotenuse candidate
        const sumSquares = a*a + b*b;
        const hypSquare = c*c;
        const error = Math.abs(hypSquare - sumSquares) / hypSquare;
        const accuracy = Math.max(0, 100 - (error * 100 * 3)); // 민감도 조절
        return { valid: accuracy > 70, accuracy: Math.round(accuracy) };
    },

    // 2. 평행사변형 (두 쌍의 대변 길이가 같아야 함)
    checkParallelogram: (points) => {
        const sides = MathUtils.getQuadSides(points); // [s1, s2, s3, s4]
        if (!sides) return { valid: false, accuracy: 0 };
        
        // 마주보는 변: s1 <-> s3, s2 <-> s4
        const diff1 = Math.abs(sides[0] - sides[2]);
        const diff2 = Math.abs(sides[1] - sides[3]);
        const perimeter = sides.reduce((a,b) => a+b, 0);
        
        const error = (diff1 + diff2) / perimeter;
        const accuracy = Math.max(0, 100 - (error * 100 * 5));
        
        return { valid: accuracy > 70, accuracy: Math.round(accuracy) };
    },

    // 3. 마름모 (네 변의 길이가 같아야 함)
    checkRhombus: (points) => {
        const sides = MathUtils.getQuadSides(points);
        if (!sides) return { valid: false, accuracy: 0 };
        
        const avg = sides.reduce((a,b) => a+b, 0) / 4;
        const deviation = sides.reduce((sum, s) => sum + Math.abs(s - avg), 0);
        const error = deviation / avg;
        
        const accuracy = Math.max(0, 100 - (error * 100 * 4));
        return { valid: accuracy > 70, accuracy: Math.round(accuracy) };
    },

    // 4. 정사각형 (마름모 성질 + 직각 성질)
    checkSquare: (points) => {
        // 1) 네 변 길이 균일성
        const rhombusCheck = MathUtils.checkRhombus(points);
        if (rhombusCheck.accuracy < 50) return { valid: false, accuracy: rhombusCheck.accuracy };

        // 2) 한 내각이 90도인지 확인
        const angle = MathUtils.getAngle(points[3], points[0], points[1]);
        const angleError = Math.abs(90 - angle);
        const angleAccuracy = Math.max(0, 100 - angleError * 2);

        // 종합 점수
        const totalAccuracy = (rhombusCheck.accuracy * 0.6) + (angleAccuracy * 0.4);
        return { valid: totalAccuracy > 75, accuracy: Math.round(totalAccuracy) };
    },

    // 5. 닮음 (SSS)
    checkSimilarity: (drawnPoints, targetSides) => {
        const drawnSides = MathUtils.getTriangleSides(drawnPoints);
        if (!drawnSides) return { valid: false, accuracy: 0 };
        
        const ratios = [
            drawnSides[0] / targetSides[0],
            drawnSides[1] / targetSides[1],
            drawnSides[2] / targetSides[2]
        ];
        const avgRatio = (ratios[0] + ratios[1] + ratios[2]) / 3;
        const deviation = Math.abs(ratios[0] - avgRatio) + Math.abs(ratios[1] - avgRatio) + Math.abs(ratios[2] - avgRatio);
        const accuracy = Math.max(0, 100 - (deviation * 100));
        
        return { valid: accuracy > 80, accuracy: Math.round(accuracy) };
    }
};
